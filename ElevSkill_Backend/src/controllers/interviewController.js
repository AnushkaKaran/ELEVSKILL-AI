import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import {
  evaluateInterviewAndRecord,
  getInterviewHistory,
  getInterviewSummary,
} from '../services/interviewService.js';

export const evaluateAnswer = asyncHandler(async (req, res) => {
  const { answerText, category, questionId, questionText, difficulty, expectedConcepts } = req.body;
  if (!answerText || typeof answerText !== 'string' || answerText.trim().length < 5) {
    throw new ApiError(422, 'Answer text is required (at least 5 characters).', 'VALIDATION_ERROR');
  }
  if (!category || typeof category !== 'string') {
    throw new ApiError(422, 'Interview category is required.', 'VALIDATION_ERROR');
  }

  const result = await evaluateInterviewAndRecord(req.user.UserId, {
    answerText,
    category,
    questionId,
    questionText,
    difficulty,
    expectedConcepts,
  });
  return ApiResponse.success(res, result, 'Interview answer evaluated.');
});

export const listInterviewHistory = asyncHandler(async (req, res) => {
  const history = await getInterviewHistory(req.user.UserId, req.query.limit);
  return ApiResponse.success(res, { history }, 'Interview history retrieved.');
});

export const interviewSummary = asyncHandler(async (req, res) => {
  const summary = await getInterviewSummary(req.user.UserId);
  return ApiResponse.success(res, { summary }, 'Interview summary retrieved.');
});
