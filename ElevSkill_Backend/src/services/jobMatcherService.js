import { getPool, sql } from '../config/database.js';
import { AI_SERVICE_CONFIG } from '../config/aiServices.js';
import { ApiError } from '../utils/ApiResponse.js';
import { callAiJsonEndpoint } from './aiClient.js';
import { logUserActivity } from './dashboardService.js';

export async function matchJobAndRecord(userId, { profile, job, resumeId = null }) {
  const cfg = AI_SERVICE_CONFIG.jobMatcher;
  const aiResult = await callAiJsonEndpoint({
    serviceName: cfg.name,
    url: `${cfg.baseUrl}/match`,
    body: { profile, job },
    timeoutMs: cfg.timeoutMs,
  });

  if (!aiResult || aiResult.valid !== true || typeof aiResult.overall_match_score !== 'number') {
    throw new ApiError(502, 'Received an incomplete response from Job Matcher.', 'AI_INVALID_RESPONSE');
  }

  const score = Math.max(0, Math.min(100, Math.round(aiResult.overall_match_score)));
  const readiness = aiResult.readiness_label || aiResult.match_label || 'Evaluated';

  const pool = await getPool();
  let verifiedResumeId = null;
  if (resumeId) {
    const owned = await pool
      .request()
      .input('resumeId', sql.Int, resumeId)
      .input('userId', sql.Int, userId)
      .query('SELECT ResumeId FROM dbo.ResumeVault WHERE ResumeId = @resumeId AND UserId = @userId');
    if (owned.recordset.length > 0) {
      verifiedResumeId = resumeId;
    }
  }

  const jobTitle = job?.title || job?.role || null;
  const jobDescription = job?.description || job?.text || '';

  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('resumeId', sql.Int, verifiedResumeId)
    .input('jobTitle', sql.NVarChar(200), jobTitle)
    .input('jobDescription', sql.NVarChar(sql.MAX), jobDescription)
    .input('overallScore', sql.Int, score)
    .input('readinessLabel', sql.NVarChar(80), readiness)
    .input('dimensionScores', sql.NVarChar(sql.MAX), JSON.stringify(aiResult.dimension_scores || {}))
    .input('matchedSkills', sql.NVarChar(sql.MAX), JSON.stringify(aiResult.matched_skills || []))
    .input('missingSkills', sql.NVarChar(sql.MAX), JSON.stringify(aiResult.missing_skills || []))
    .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(aiResult))
    .query(`
      INSERT INTO dbo.JobMatchHistory
        (UserId, ResumeId, JobTitle, JobDescription, OverallScore, ReadinessLabel, DimensionScores, MatchedSkills, MissingSkills, MatchPayloadJson)
      OUTPUT INSERTED.MatchId, INSERTED.MatchDate
      VALUES (@userId, @resumeId, @jobTitle, @jobDescription, @overallScore, @readinessLabel, @dimensionScores, @matchedSkills, @missingSkills, @payload)
    `);

  await logUserActivity(userId, {
    title: `Completed job matching (${score}% match)`,
    category: 'Job Matcher',
    badge: `${score}% Match`,
    variant: score >= 65 ? 'success' : 'blue',
  });

  const row = inserted.recordset[0];
  return {
    match: aiResult,
    historyRecord: {
      matchId: row.MatchId,
      matchPercent: score,
      readiness,
      jobTitle,
      comparedAt: row.MatchDate,
    },
  };
}

export async function getJobMatchHistory(userId, limit = 20) {
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('limit', sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit)
        MatchId, ResumeId, JobTitle, OverallScore, ReadinessLabel, DimensionScores, MatchedSkills, MissingSkills, MatchDate
      FROM dbo.JobMatchHistory
      WHERE UserId = @userId
      ORDER BY MatchDate DESC
    `);

  return result.recordset.map((row) => ({
    matchId: row.MatchId,
    resumeId: row.ResumeId,
    jobTitle: row.JobTitle || 'Target Role',
    matchPercent: row.OverallScore,
    readiness: row.ReadinessLabel || 'Evaluated',
    dimensionScores: row.DimensionScores ? JSON.parse(row.DimensionScores) : {},
    matchedSkills: row.MatchedSkills ? JSON.parse(row.MatchedSkills) : [],
    missingSkills: row.MissingSkills ? JSON.parse(row.MissingSkills) : [],
    comparedAt: row.MatchDate,
  }));
}
