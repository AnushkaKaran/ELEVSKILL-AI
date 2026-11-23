import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { resetUserWorkspaceData, serializeUser, updateUserProfile } from '../services/authService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const user = serializeUser(req.user);
  return ApiResponse.success(
    res,
    {
      settings: {
        emailNotifications: user.emailNotifications,
        onboardingDismissed: user.onboardingDismissed,
        themeVariant: user.themeVariant,
      },
    },
    'Settings retrieved.'
  );
});

export const updateSettings = asyncHandler(async (req, res) => {
  const {
    emailNotifications,
    onboardingDismissed,
    themeVariant,
  } = req.body;

  const updated = await updateUserProfile(req.user.UserId, {
    emailNotifications,
    onboardingDismissed,
    themeVariant,
  });

  return ApiResponse.success(
    res,
    {
      settings: {
        emailNotifications: updated.emailNotifications,
        onboardingDismissed: updated.onboardingDismissed,
        themeVariant: updated.themeVariant,
      },
      profile: updated,
    },
    'Settings updated successfully.'
  );
});

export const resetUserData = asyncHandler(async (req, res) => {
  if (req.body?.confirm !== true && req.body?.confirmation !== 'RESET') {
    throw new ApiError(
      400,
      'Explicit confirmation is required to reset account data (pass { confirm: true }).',
      'CONFIRMATION_REQUIRED'
    );
  }

  await resetUserWorkspaceData(req.user.UserId);
  return ApiResponse.success(res, null, 'All user workspace data has been reset.');
});
