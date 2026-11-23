import { body } from 'express-validator';

export const updateProfileValidator = [
  body('fullName').optional().trim().isLength({ min: 1, max: 150 }).withMessage('Full name must be 1-150 characters.'),
  body('name').optional().trim().isLength({ min: 1, max: 150 }).withMessage('Name must be 1-150 characters.'),
  body('education').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('degree').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('institution').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('graduationYear').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('targetRole').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('experienceLevel').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('skills').optional({ nullable: true }).isString(),
  body('careerInterests').optional({ nullable: true }).isString(),
  body('emailNotifications').optional().isBoolean(),
  body('onboardingDismissed').optional().isBoolean(),
  body('themeVariant').optional().isIn(['lavender', 'blossom', 'sky']).withMessage('Invalid theme variant.'),
];

export const updateSettingsValidator = [
  body('emailNotifications').optional().isBoolean(),
  body('onboardingDismissed').optional().isBoolean(),
  body('themeVariant').optional().isIn(['lavender', 'blossom', 'sky']).withMessage('Invalid theme variant.'),
];
