import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { loginUser, registerUser, serializeUser } from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  const result = await registerUser({ fullName, email, password });
  return ApiResponse.created(res, result, 'Account registered successfully.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });
  return ApiResponse.success(res, result, 'Logged in successfully.');
});

export const logout = asyncHandler(async (_req, res) => {
  return ApiResponse.success(res, null, 'Logged out successfully.');
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { user: serializeUser(req.user) }, 'Current user retrieved.');
});
