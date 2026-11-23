import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { serializeUser, updateUserProfile } from '../services/authService.js';

export const getProfile = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { profile: serializeUser(req.user) }, 'Profile retrieved.');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updated = await updateUserProfile(req.user.UserId, req.body);
  return ApiResponse.success(res, { profile: updated }, 'Profile updated successfully.');
});
