import { getPool, sql } from '../config/database.js';
import { AI_SERVICE_CONFIG } from '../config/aiServices.js';
import { ApiError } from '../utils/ApiResponse.js';
import { callAiJsonEndpoint } from './aiClient.js';
import { logUserActivity } from './dashboardService.js';

export async function evaluateInterviewAndRecord(
  userId,
  { answerText, category, questionId = null, questionText = null, difficulty = null, expectedConcepts = null }
) {
  const cfg = AI_SERVICE_CONFIG.interviewCoach;
  const aiResult = await callAiJsonEndpoint({
    serviceName: cfg.name,
    url: `${cfg.baseUrl}/evaluate`,
    body: {
      answer_text: answerText,
      category,
      question_id: questionId,
      question_text: questionText,
      ...(Array.isArray(expectedConcepts) ? { expected_concepts: expectedConcepts } : {}),
    },
    timeoutMs: cfg.timeoutMs,
  });

  if (!aiResult || aiResult.valid !== true || typeof aiResult.overall_score !== 'number') {
    throw new ApiError(502, 'Received an incomplete evaluation from Interview Coach.', 'AI_INVALID_RESPONSE');
  }

  const score = Math.max(0, Math.min(100, Math.round(aiResult.overall_score)));
  const feedback =
    typeof aiResult.summary_feedback === 'string'
      ? aiResult.summary_feedback
      : Array.isArray(aiResult.suggestions)
        ? aiResult.suggestions.join(' ')
        : '';

  const pool = await getPool();
  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('questionId', sql.NVarChar(100), questionId)
    .input('questionText', sql.NVarChar(sql.MAX), questionText)
    .input('category', sql.NVarChar(80), category)
    .input('difficulty', sql.NVarChar(40), difficulty)
    .input('answerText', sql.NVarChar(sql.MAX), answerText)
    .input('score', sql.Int, score)
    .input('feedback', sql.NVarChar(sql.MAX), feedback)
    .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(aiResult))
    .query(`
      INSERT INTO dbo.InterviewHistory
        (UserId, QuestionId, QuestionText, Category, Difficulty, AnswerText, EvaluationScore, Feedback, EvaluationPayloadJson)
      OUTPUT INSERTED.InterviewId, INSERTED.EvaluationDate
      VALUES (@userId, @questionId, @questionText, @category, @difficulty, @answerText, @score, @feedback, @payload)
    `);

  await logUserActivity(userId, {
    title: `Practiced ${category} interview question (${score}/100)`,
    category: 'Interview Coach',
    badge: `${score}%`,
    variant: score >= 75 ? 'success' : 'blue',
  });

  const row = inserted.recordset[0];
  return {
    evaluation: aiResult,
    historyRecord: {
      id: `int-${row.InterviewId}`,
      interviewId: row.InterviewId,
      score,
      category,
      questionId,
      questionText: questionText || '',
      difficulty: difficulty || null,
      practicedAt: row.EvaluationDate,
    },
  };
}

export async function getInterviewHistory(userId, limit = 30) {
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('limit', sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit)
        InterviewId, QuestionId, QuestionText, Category, Difficulty, EvaluationScore, Feedback, EvaluationDate
      FROM dbo.InterviewHistory
      WHERE UserId = @userId
      ORDER BY EvaluationDate DESC
    `);

  return result.recordset.map((row) => ({
    id: `int-${row.InterviewId}`,
    interviewId: row.InterviewId,
    questionId: row.QuestionId,
    questionText: row.QuestionText || '',
    category: row.Category,
    difficulty: row.Difficulty,
    score: row.EvaluationScore,
    feedback: row.Feedback || '',
    practicedAt: row.EvaluationDate,
  }));
}

export async function getInterviewSummary(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        COUNT(*) AS totalPracticed,
        AVG(CAST(EvaluationScore AS FLOAT)) AS averageScore,
        MAX(EvaluationScore) AS bestScore,
        MAX(EvaluationDate) AS lastPracticedAt
      FROM dbo.InterviewHistory
      WHERE UserId = @userId
    `);

  const byCategoryRes = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT Category, COUNT(*) AS count, AVG(CAST(EvaluationScore AS FLOAT)) AS averageScore
      FROM dbo.InterviewHistory
      WHERE UserId = @userId
      GROUP BY Category
    `);

  const stats = result.recordset[0] || {};
  return {
    totalPracticed: Number(stats.totalPracticed || 0),
    averageScore: stats.averageScore ? Math.round(stats.averageScore) : null,
    bestScore: stats.bestScore !== null && stats.bestScore !== undefined ? Number(stats.bestScore) : null,
    lastPracticedAt: stats.lastPracticedAt || null,
    byCategory: byCategoryRes.recordset.map((r) => ({
      category: r.Category,
      count: Number(r.count),
      averageScore: Math.round(r.averageScore),
    })),
  };
}
