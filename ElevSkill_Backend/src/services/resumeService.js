import fs from 'node:fs/promises';
import path from 'node:path';
import { getPool, sql } from '../config/database.js';
import { AI_SERVICE_CONFIG } from '../config/aiServices.js';
import { ApiError } from '../utils/ApiResponse.js';
import { callAiJsonEndpoint } from './aiClient.js';
import { logUserActivity } from './dashboardService.js';
import {
  TEMP_UPLOAD_DIR,
  promoteTempPdfToVault,
  removeStoredResumeFile,
  removeTempFile,
  resolveStoredResumePath,
} from '../middleware/uploadMiddleware.js';

function getResumeStatusLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Developing';
  return 'Needs Work';
}

export function serializeVaultResume(row) {
  return {
    id: `res-${row.ResumeId}`,
    resumeId: row.ResumeId,
    name: row.ResumeName,
    text: row.ExtractedText,
    classification: row.CandidateClassification || '',
    originalFileName: row.OriginalFileName || null,
    hasOriginalPdf: Boolean(row.StoredFilePath),
    fileSize: row.FileSize !== null && row.FileSize !== undefined ? Number(row.FileSize) : null,
    lastScore: row.LastAnalysisScore !== null && row.LastAnalysisScore !== undefined ? Number(row.LastAnalysisScore) : null,
    savedAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export async function extractPdfViaAiService(file) {
  if (!file || !file.path) {
    throw new ApiError(400, 'Please upload a valid PDF file.', 'MISSING_FILE');
  }

  const fileBuffer = await fs.readFile(file.path);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', blob, file.originalname || 'resume.pdf');

  const cfg = AI_SERVICE_CONFIG.resumeAnalyzer;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), cfg.timeoutMs);

  let response;
  try {
    response = await fetch(`${cfg.baseUrl}/extract-pdf`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    await removeTempFile(file.path);
    if (err?.name === 'AbortError') {
      throw new ApiError(504, 'Resume PDF extraction timed out.', 'AI_SERVICE_TIMEOUT');
    }
    throw new ApiError(
      503,
      'Unable to reach the Resume Analyzer AI service to extract PDF text.',
      'AI_SERVICE_UNAVAILABLE'
    );
  }

  clearTimeout(timer);

  let data;
  try {
    data = await response.json();
  } catch {
    await removeTempFile(file.path);
    throw new ApiError(502, 'Invalid response from Resume Analyzer PDF extractor.', 'AI_INVALID_RESPONSE');
  }

  if (!response.ok) {
    await removeTempFile(file.path);
    throw new ApiError(
      response.status,
      data?.detail || 'Failed to extract text from PDF.',
      'AI_VALIDATION_ERROR'
    );
  }

  return {
    ...data,
    tempFileId: path.basename(file.path),
    originalFileName: file.originalname || 'resume.pdf',
    fileSize: file.size || fileBuffer.length,
  };
}

export async function analyzeResumeAndRecord(userId, { resumeText, jobDescription = null, resumeId = null }) {
  const cfg = AI_SERVICE_CONFIG.resumeAnalyzer;
  const aiResult = await callAiJsonEndpoint({
    serviceName: cfg.name,
    url: `${cfg.baseUrl}/analyze`,
    body: {
      resume_text: resumeText,
      job_description: jobDescription && jobDescription.trim() ? jobDescription : null,
    },
    timeoutMs: cfg.timeoutMs,
  });

  if (!aiResult || aiResult.valid !== true || typeof aiResult.overall_score !== 'number') {
    throw new ApiError(502, 'Received an incomplete analysis from Resume Analyzer.', 'AI_INVALID_RESPONSE');
  }

  const pool = await getPool();
  const score = Math.max(0, Math.min(100, Math.round(aiResult.overall_score)));
  const statusLabel = getResumeStatusLabel(score);
  const wordCount =
    typeof aiResult.word_count === 'number'
      ? aiResult.word_count
      : resumeText.trim().split(/\s+/).filter(Boolean).length;

  let verifiedResumeId = null;
  if (resumeId) {
    const owned = await pool
      .request()
      .input('resumeId', sql.Int, resumeId)
      .input('userId', sql.Int, userId)
      .query('SELECT ResumeId FROM dbo.ResumeVault WHERE ResumeId = @resumeId AND UserId = @userId');
    if (owned.recordset.length > 0) {
      verifiedResumeId = resumeId;
      await pool
        .request()
        .input('resumeId', sql.Int, verifiedResumeId)
        .input('userId', sql.Int, userId)
        .input('score', sql.Int, score)
        .query(`
          UPDATE dbo.ResumeVault
          SET LastAnalysisScore = @score, UpdatedAt = SYSUTCDATETIME()
          WHERE ResumeId = @resumeId AND UserId = @userId
        `);
    }
  }

  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('resumeId', sql.Int, verifiedResumeId)
    .input('overallScore', sql.Int, score)
    .input('statusLabel', sql.NVarChar(80), statusLabel)
    .input('wordCount', sql.Int, wordCount)
    .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(aiResult))
    .query(`
      INSERT INTO dbo.ResumeAnalyses (UserId, ResumeId, OverallScore, StatusLabel, WordCount, AnalysisPayloadJson)
      OUTPUT INSERTED.AnalysisId, INSERTED.AnalyzedAt
      VALUES (@userId, @resumeId, @overallScore, @statusLabel, @wordCount, @payload)
    `);

  await logUserActivity(userId, {
    title: `Completed resume analysis (${score}/100 · ${statusLabel})`,
    category: 'Resume Analyzer',
    badge: `${score}%`,
    variant: score >= 75 ? 'success' : 'blue',
  });

  return {
    analysis: aiResult,
    historyRecord: {
      analysisId: inserted.recordset[0].AnalysisId,
      score,
      status: statusLabel,
      wordCount,
      analyzedAt: inserted.recordset[0].AnalyzedAt,
    },
  };
}

export async function getResumeAnalysisHistory(userId, limit = 20) {
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('limit', sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit) AnalysisId, ResumeId, OverallScore, StatusLabel, WordCount, AnalyzedAt
      FROM dbo.ResumeAnalyses
      WHERE UserId = @userId
      ORDER BY AnalyzedAt DESC
    `);

  return result.recordset.map((row) => ({
    analysisId: row.AnalysisId,
    resumeId: row.ResumeId,
    score: row.OverallScore,
    status: row.StatusLabel || getResumeStatusLabel(row.OverallScore),
    wordCount: row.WordCount,
    analyzedAt: row.AnalyzedAt,
  }));
}

export async function listVaultResumes(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT ResumeId, UserId, ResumeName, ExtractedText, CandidateClassification,
             OriginalFileName, StoredFilePath, FileSize, LastAnalysisScore, CreatedAt, UpdatedAt
      FROM dbo.ResumeVault
      WHERE UserId = @userId
      ORDER BY UpdatedAt DESC
    `);
  return result.recordset.map(serializeVaultResume);
}

export async function getVaultResumeById(userId, resumeId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('resumeId', sql.Int, resumeId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT ResumeId, UserId, ResumeName, ExtractedText, CandidateClassification,
             OriginalFileName, StoredFilePath, FileSize, LastAnalysisScore, CreatedAt, UpdatedAt
      FROM dbo.ResumeVault
      WHERE ResumeId = @resumeId AND UserId = @userId
    `);
  const row = result.recordset[0];
  if (!row) {
    throw new ApiError(404, 'Saved resume not found.', 'RESUME_NOT_FOUND');
  }
  return row;
}

export async function saveResumeToVault(
  userId,
  {
    name,
    text,
    lastScore = null,
    classification = '',
    originalFileName = null,
    tempFileId = null,
    retainOriginalPdf = false,
  }
) {
  let storedFileName = null;
  let fileSize = null;

  if (tempFileId) {
    const safeTempBase = path.basename(tempFileId);
    const tempPath = path.join(TEMP_UPLOAD_DIR, safeTempBase);
    if (retainOriginalPdf) {
      try {
        const stat = await fs.stat(tempPath);
        fileSize = stat.size;
        storedFileName = await promoteTempPdfToVault(tempPath, userId);
      } catch {
        throw new ApiError(400, 'Temporary PDF file expired or could not be retained.', 'TEMP_FILE_MISSING');
      }
    } else {
      await removeTempFile(tempPath);
    }
  }

  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('name', sql.NVarChar(200), name.trim())
    .input('text', sql.NVarChar(sql.MAX), text)
    .input('classification', sql.NVarChar(150), classification || null)
    .input('originalFileName', sql.NVarChar(255), retainOriginalPdf ? originalFileName : null)
    .input('storedFilePath', sql.NVarChar(500), storedFileName)
    .input('fileSize', sql.BigInt, fileSize)
    .input('lastScore', sql.Int, lastScore !== null && lastScore !== undefined ? Math.round(lastScore) : null)
    .query(`
      INSERT INTO dbo.ResumeVault
        (UserId, ResumeName, ExtractedText, CandidateClassification, OriginalFileName, StoredFilePath, FileSize, LastAnalysisScore)
      OUTPUT INSERTED.*
      VALUES (@userId, @name, @text, @classification, @originalFileName, @storedFilePath, @fileSize, @lastScore)
    `);

  await logUserActivity(userId, {
    title: `Saved resume "${name.trim()}" to Resume Vault`,
    category: 'Resume Vault',
    badge: 'Saved',
    variant: 'success',
  });

  return serializeVaultResume(inserted.recordset[0]);
}

export async function updateVaultResume(userId, resumeId, patch) {
  const existing = await getVaultResumeById(userId, resumeId);
  const pool = await getPool();

  const updated = await pool
    .request()
    .input('resumeId', sql.Int, resumeId)
    .input('userId', sql.Int, userId)
    .input('name', sql.NVarChar(200), (patch.name ?? existing.ResumeName).trim())
    .input('text', sql.NVarChar(sql.MAX), patch.text ?? existing.ExtractedText)
    .input('classification', sql.NVarChar(150), patch.classification !== undefined ? patch.classification : existing.CandidateClassification)
    .input(
      'lastScore',
      sql.Int,
      patch.lastScore !== undefined
        ? patch.lastScore === null
          ? null
          : Math.round(patch.lastScore)
        : existing.LastAnalysisScore
    )
    .query(`
      UPDATE dbo.ResumeVault
      SET ResumeName = @name,
          ExtractedText = @text,
          CandidateClassification = @classification,
          LastAnalysisScore = @lastScore,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE ResumeId = @resumeId AND UserId = @userId
    `);

  return serializeVaultResume(updated.recordset[0]);
}

export async function deleteVaultResume(userId, resumeId) {
  const existing = await getVaultResumeById(userId, resumeId);
  const pool = await getPool();

  await pool
    .request()
    .input('resumeId', sql.Int, resumeId)
    .input('userId', sql.Int, userId)
    .query('UPDATE dbo.ResumeAnalyses SET ResumeId = NULL WHERE ResumeId = @resumeId AND UserId = @userId');

  await pool
    .request()
    .input('resumeId', sql.Int, resumeId)
    .input('userId', sql.Int, userId)
    .query('UPDATE dbo.JobMatchHistory SET ResumeId = NULL WHERE ResumeId = @resumeId AND UserId = @userId');

  await pool
    .request()
    .input('resumeId', sql.Int, resumeId)
    .input('userId', sql.Int, userId)
    .query('DELETE FROM dbo.ResumeVault WHERE ResumeId = @resumeId AND UserId = @userId');

  if (existing.StoredFilePath) {
    await removeStoredResumeFile(existing.StoredFilePath);
  }
}

export async function getVaultResumeDownloadInfo(userId, resumeId) {
  const row = await getVaultResumeById(userId, resumeId);
  if (!row.StoredFilePath) {
    throw new ApiError(404, 'No original PDF was retained for this resume.', 'PDF_NOT_FOUND');
  }
  const fullPath = resolveStoredResumePath(row.StoredFilePath);
  try {
    await fs.access(fullPath);
  } catch {
    throw new ApiError(404, 'Stored PDF file is no longer available.', 'PDF_NOT_FOUND');
  }
  return {
    fullPath,
    downloadName: row.OriginalFileName || `${row.ResumeName}.pdf`,
  };
}

export async function listResumeDrafts(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT DraftId, DraftTitle, TemplateName, DraftDataJson, CreatedAt, UpdatedAt
      FROM dbo.ResumeDrafts
      WHERE UserId = @userId
      ORDER BY UpdatedAt DESC
    `);

  return result.recordset.map((row) => ({
    draftId: row.DraftId,
    title: row.DraftTitle,
    template: row.TemplateName,
    draftData: JSON.parse(row.DraftDataJson),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  }));
}

export async function saveResumeDraft(userId, { title = 'Untitled Resume', template = 'modern', draftData }) {
  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('title', sql.NVarChar(200), title.trim() || 'Untitled Resume')
    .input('template', sql.NVarChar(60), template || 'modern')
    .input('draftDataJson', sql.NVarChar(sql.MAX), JSON.stringify(draftData))
    .query(`
      INSERT INTO dbo.ResumeDrafts (UserId, DraftTitle, TemplateName, DraftDataJson)
      OUTPUT INSERTED.*
      VALUES (@userId, @title, @template, @draftDataJson)
    `);
  const row = inserted.recordset[0];
  return {
    draftId: row.DraftId,
    title: row.DraftTitle,
    template: row.TemplateName,
    draftData: JSON.parse(row.DraftDataJson),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export async function updateResumeDraft(userId, draftId, { title, template, draftData }) {
  const pool = await getPool();
  const existingRes = await pool
    .request()
    .input('draftId', sql.Int, draftId)
    .input('userId', sql.Int, userId)
    .query('SELECT * FROM dbo.ResumeDrafts WHERE DraftId = @draftId AND UserId = @userId');
  const existing = existingRes.recordset[0];
  if (!existing) {
    throw new ApiError(404, 'Resume draft not found.', 'DRAFT_NOT_FOUND');
  }

  const updated = await pool
    .request()
    .input('draftId', sql.Int, draftId)
    .input('userId', sql.Int, userId)
    .input('title', sql.NVarChar(200), title ? title.trim() : existing.DraftTitle)
    .input('template', sql.NVarChar(60), template || existing.TemplateName)
    .input('draftDataJson', sql.NVarChar(sql.MAX), draftData ? JSON.stringify(draftData) : existing.DraftDataJson)
    .query(`
      UPDATE dbo.ResumeDrafts
      SET DraftTitle = @title, TemplateName = @template, DraftDataJson = @draftDataJson, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE DraftId = @draftId AND UserId = @userId
    `);
  const row = updated.recordset[0];
  return {
    draftId: row.DraftId,
    title: row.DraftTitle,
    template: row.TemplateName,
    draftData: JSON.parse(row.DraftDataJson),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}
