import { getPool, sql } from '../config/database.js';
import { serializeUser } from './authService.js';

export async function logUserActivity(userId, { title, category, badge = null, variant = 'neutral' }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('title', sql.NVarChar(300), title)
    .input('category', sql.NVarChar(80), category)
    .input('badge', sql.NVarChar(50), badge)
    .input('variant', sql.NVarChar(30), variant)
    .query(`
      INSERT INTO dbo.ActivityLogs (UserId, Title, Category, Badge, Variant)
      OUTPUT INSERTED.ActivityId, INSERTED.Title, INSERTED.Category, INSERTED.Badge, INSERTED.Variant, INSERTED.CreatedAt
      VALUES (@userId, @title, @category, @badge, @variant)
    `);
  return result.recordset[0];
}

export async function getUserActivityLogs(userId, limit = 15) {
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 15));
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('limit', sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit)
        ActivityId, Title, Category, Badge, Variant, CreatedAt
      FROM dbo.ActivityLogs
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset.map((row) => ({
    id: `act-${row.ActivityId}`,
    activityId: row.ActivityId,
    title: row.Title,
    category: row.Category,
    badge: row.Badge,
    variant: row.Variant,
    createdAt: row.CreatedAt,
  }));
}

export async function getDashboardSummary(userRow) {
  const userId = userRow.UserId;
  const pool = await getPool();

  const [
    resumeStatsRes,
    latestResumeRes,
    interviewStatsRes,
    latestInterviewRes,
    matchStatsRes,
    latestMatchRes,
    roadmapSkillsRes,
    activityLog,
  ] = await Promise.all([
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT COUNT(*) AS savedResumesCount FROM dbo.ResumeVault WHERE UserId = @userId
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT TOP 1 AnalysisId, OverallScore, StatusLabel, WordCount, AnalyzedAt
      FROM dbo.ResumeAnalyses
      WHERE UserId = @userId
      ORDER BY AnalyzedAt DESC
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT COUNT(*) AS totalPracticed, AVG(CAST(EvaluationScore AS FLOAT)) AS avgScore
      FROM dbo.InterviewHistory
      WHERE UserId = @userId
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT TOP 1 InterviewId, Category, EvaluationScore, EvaluationDate
      FROM dbo.InterviewHistory
      WHERE UserId = @userId
      ORDER BY EvaluationDate DESC
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT COUNT(*) AS totalMatches FROM dbo.JobMatchHistory WHERE UserId = @userId
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT TOP 1 MatchId, OverallScore, ReadinessLabel, MatchDate
      FROM dbo.JobMatchHistory
      WHERE UserId = @userId
      ORDER BY MatchDate DESC
    `),
    pool.request().input('userId', sql.Int, userId).query(`
      SELECT SkillId, SkillName, Category, Priority, Status, IsKnown, EstimatedHours, CompletedAt
      FROM dbo.RoadmapSkills
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `),
    getUserActivityLogs(userId, 15),
  ]);

  const latestResumeRow = latestResumeRes.recordset[0] || null;
  const latestResumeAnalysis = latestResumeRow
    ? {
        analysisId: latestResumeRow.AnalysisId,
        score: latestResumeRow.OverallScore,
        status: latestResumeRow.StatusLabel || 'Evaluated',
        wordCount: latestResumeRow.WordCount,
        analyzedAt: latestResumeRow.AnalyzedAt,
      }
    : null;

  const interviewStatsRow = interviewStatsRes.recordset[0] || {};
  const latestInterviewRow = latestInterviewRes.recordset[0] || null;
  const latestInterviewSession = latestInterviewRow
    ? {
        score: latestInterviewRow.EvaluationScore,
        category: latestInterviewRow.Category,
        practicedAt: latestInterviewRow.EvaluationDate,
        totalPracticed: Number(interviewStatsRow.totalPracticed || 0),
      }
    : null;

  const latestMatchRow = latestMatchRes.recordset[0] || null;
  const latestJobMatch = latestMatchRow
    ? {
        matchId: latestMatchRow.MatchId,
        matchPercent: latestMatchRow.OverallScore,
        readiness: latestMatchRow.ReadinessLabel || 'Evaluated',
        comparedAt: latestMatchRow.MatchDate,
      }
    : null;

  const roadmapSkills = roadmapSkillsRes.recordset.map((s) => ({
    id: `sk-${s.SkillId}`,
    skillId: s.SkillId,
    title: s.SkillName,
    category: s.Category,
    priority: s.Priority,
    hours: Number(s.EstimatedHours),
    status: s.Status,
    completed: s.Status === 'completed',
    alreadyKnown: Boolean(s.IsKnown),
    completedAt: s.CompletedAt,
  }));

  const completedCount = roadmapSkills.filter((s) => s.status === 'completed').length;
  const inProgressCount = roadmapSkills.filter((s) => s.status === 'in_progress').length;
  const totalCount = roadmapSkills.length;

  return {
    profile: serializeUser(userRow),
    stats: {
      savedResumesCount: Number(resumeStatsRes.recordset[0]?.savedResumesCount || 0),
      totalInterviewsPracticed: Number(interviewStatsRow.totalPracticed || 0),
      averageInterviewScore: interviewStatsRow.avgScore ? Math.round(interviewStatsRow.avgScore) : null,
      totalJobMatches: Number(matchStatsRes.recordset[0]?.totalMatches || 0),
      roadmapTotalSkills: totalCount,
      roadmapCompletedSkills: completedCount,
      roadmapInProgressSkills: inProgressCount,
      roadmapProgressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
    latestResumeAnalysis,
    latestInterviewSession,
    latestJobMatch,
    roadmapSkills,
    activityLog,
  };
}
