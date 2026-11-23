import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { getJobMatchHistory, matchJobAndRecord } from '../services/jobMatcherService.js';

export const compareJobMatch = asyncHandler(async (req, res) => {
  const { profile, job, resumeId } = req.body;
  if (!profile || typeof profile !== 'object' || !job || typeof job !== 'object') {
    throw new ApiError(422, 'Both profile and job objects are required.', 'VALIDATION_ERROR');
  }

  const cleanedResumeId = resumeId
    ? Number(String(resumeId).replace(/^res-/, ''))
    : null;

  const result = await matchJobAndRecord(req.user.UserId, {
    profile,
    job,
    resumeId: Number.isInteger(cleanedResumeId) && cleanedResumeId > 0 ? cleanedResumeId : null,
  });
  return ApiResponse.success(res, result, 'Job match evaluated.');
});

export const listJobMatchHistory = asyncHandler(async (req, res) => {
  const history = await getJobMatchHistory(req.user.UserId, req.query.limit);
  return ApiResponse.success(res, { history }, 'Job match history retrieved.');
});
