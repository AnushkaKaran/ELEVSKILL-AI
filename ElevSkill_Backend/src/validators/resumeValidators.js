import { body } from 'express-validator';

export const analyzeResumeValidator = [
  body('resumeText')
    .isString()
    .trim()
    .isLength({ min: 30 })
    .withMessage('Resume text must be at least 30 characters.'),
  body('jobDescription').optional({ nullable: true }).isString(),
  body('resumeId').optional({ nullable: true }).isInt({ min: 1 }),
];

export const saveResumeValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Resume name is required.')
    .isLength({ max: 200 })
    .withMessage('Resume name cannot exceed 200 characters.'),
  body('text')
    .isString()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Resume text is required.'),
  body('lastScore').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
  body('classification').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('originalFileName').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('tempFileId').optional({ nullable: true }).isString().isLength({ max: 200 }),
  body('retainOriginalPdf').optional().isBoolean(),
];

export const updateResumeValidator = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('text').optional().isString().trim().isLength({ min: 10 }),
  body('lastScore').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
  body('classification').optional({ nullable: true }).isString().isLength({ max: 150 }),
];

export const saveDraftValidator = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('template').optional().trim().isLength({ min: 1, max: 60 }),
  body('draftData').isObject().withMessage('Draft data object is required.'),
];
