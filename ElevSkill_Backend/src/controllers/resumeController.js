import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import {
  analyzeResumeAndRecord,
  deleteVaultResume,
  extractPdfViaAiService,
  getResumeAnalysisHistory,
  getVaultResumeById,
  getVaultResumeDownloadInfo,
  listResumeDrafts,
  listVaultResumes,
  saveResumeDraft,
  saveResumeToVault,
  serializeVaultResume,
  updateResumeDraft,
  updateVaultResume,
} from '../services/resumeService.js';

function parsePositiveId(raw, label = 'ID') {
  const cleaned = String(raw || '').replace(/^(res|draft)-/, '');
  const id = Number(cleaned);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${label}.`, 'INVALID_ID');
  }
  return id;
}

export const extractPdf = asyncHandler(async (req, res) => {
  const result = await extractPdfViaAiService(req.file);
  return ApiResponse.success(res, result, 'PDF text extracted successfully.');
});

export const analyzeResume = asyncHandler(async (req, res) => {
  const { resumeText, jobDescription, resumeId } = req.body;
  const result = await analyzeResumeAndRecord(req.user.UserId, {
    resumeText,
    jobDescription,
    resumeId: resumeId ? parsePositiveId(resumeId, 'resume ID') : null,
  });
  return ApiResponse.success(res, result, 'Resume analyzed successfully.');
});

export const getAnalysisHistory = asyncHandler(async (req, res) => {
  const history = await getResumeAnalysisHistory(req.user.UserId, req.query.limit);
  return ApiResponse.success(res, { history }, 'Resume analysis history retrieved.');
});

export const listResumes = asyncHandler(async (req, res) => {
  const resumes = await listVaultResumes(req.user.UserId);
  return ApiResponse.success(res, { resumes }, 'Saved resumes retrieved.');
});

export const getResume = asyncHandler(async (req, res) => {
  const resumeId = parsePositiveId(req.params.id, 'resume ID');
  const row = await getVaultResumeById(req.user.UserId, resumeId);
  return ApiResponse.success(res, { resume: serializeVaultResume(row) }, 'Saved resume retrieved.');
});

export const createVaultResume = asyncHandler(async (req, res) => {
  const resume = await saveResumeToVault(req.user.UserId, req.body);
  return ApiResponse.created(res, { resume }, 'Resume saved to Vault.');
});

export const patchVaultResume = asyncHandler(async (req, res) => {
  const resumeId = parsePositiveId(req.params.id, 'resume ID');
  const resume = await updateVaultResume(req.user.UserId, resumeId, req.body);
  return ApiResponse.success(res, { resume }, 'Saved resume updated.');
});

export const removeVaultResume = asyncHandler(async (req, res) => {
  const resumeId = parsePositiveId(req.params.id, 'resume ID');
  await deleteVaultResume(req.user.UserId, resumeId);
  return ApiResponse.success(res, null, 'Saved resume deleted.');
});

export const downloadVaultResumePdf = asyncHandler(async (req, res) => {
  const resumeId = parsePositiveId(req.params.id, 'resume ID');
  const { fullPath, downloadName } = await getVaultResumeDownloadInfo(req.user.UserId, resumeId);
  return res.download(fullPath, downloadName);
});

export const getDrafts = asyncHandler(async (req, res) => {
  const drafts = await listResumeDrafts(req.user.UserId);
  return ApiResponse.success(res, { drafts }, 'Resume drafts retrieved.');
});

export const createDraft = asyncHandler(async (req, res) => {
  const draft = await saveResumeDraft(req.user.UserId, req.body);
  return ApiResponse.created(res, { draft }, 'Resume draft saved.');
});

export const patchDraft = asyncHandler(async (req, res) => {
  const draftId = parsePositiveId(req.params.draftId, 'draft ID');
  const draft = await updateResumeDraft(req.user.UserId, draftId, req.body);
  return ApiResponse.success(res, { draft }, 'Resume draft updated.');
});
