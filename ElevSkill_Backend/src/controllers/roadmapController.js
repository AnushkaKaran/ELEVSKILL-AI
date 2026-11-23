import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import {
  addRoadmapSkill,
  deleteRoadmapSkill,
  generateRoadmapViaAi,
  getUserRoadmapAndSkills,
  resetRoadmapSkills,
  syncRoadmapSkillsBatch,
  updateRoadmapSkill,
} from '../services/roadmapService.js';

function parseSkillId(raw) {
  const id = Number(String(raw || '').replace(/^sk-/, ''));
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'Invalid skill ID.', 'INVALID_ID');
  }
  return id;
}

export const getRoadmap = asyncHandler(async (req, res) => {
  const data = await getUserRoadmapAndSkills(req.user.UserId);
  return ApiResponse.success(res, data, 'Career roadmap retrieved.');
});

export const generateRoadmap = asyncHandler(async (req, res) => {
  const roadmap = await generateRoadmapViaAi(req.user.UserId, req.body);
  return ApiResponse.success(res, { roadmap }, 'Career roadmap generated.');
});

export const createSkill = asyncHandler(async (req, res) => {
  const skill = await addRoadmapSkill(req.user.UserId, req.body);
  return ApiResponse.created(res, { skill }, 'Roadmap skill added.');
});

export const syncRecommendations = asyncHandler(async (req, res) => {
  const result = await syncRoadmapSkillsBatch(req.user.UserId, req.body?.skills || req.body?.items);
  return ApiResponse.success(res, result, 'Recommended skills synchronized.');
});

export const patchSkill = asyncHandler(async (req, res) => {
  const skillId = parseSkillId(req.params.skillId);
  const skill = await updateRoadmapSkill(req.user.UserId, skillId, req.body);
  return ApiResponse.success(res, { skill }, 'Roadmap skill updated.');
});

export const removeSkill = asyncHandler(async (req, res) => {
  const skillId = parseSkillId(req.params.skillId);
  await deleteRoadmapSkill(req.user.UserId, skillId);
  return ApiResponse.success(res, null, 'Roadmap skill removed.');
});

export const clearRoadmap = asyncHandler(async (req, res) => {
  await resetRoadmapSkills(req.user.UserId);
  return ApiResponse.success(res, null, 'Career roadmap cleared.');
});
