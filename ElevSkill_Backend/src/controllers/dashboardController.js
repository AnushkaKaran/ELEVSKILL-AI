import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getDashboardSummary, logUserActivity } from '../services/dashboardService.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary(req.user);
  return ApiResponse.success(res, summary, 'Dashboard data retrieved.');
});

export const createActivityLog = asyncHandler(async (req, res) => {
  const { title, category, badge, variant } = req.body;
  const entry = await logUserActivity(req.user.UserId, { title, category, badge, variant });
  return ApiResponse.created(res, { activity: entry }, 'Activity logged.');
});
