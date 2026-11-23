import { body } from 'express-validator';

export const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Full name must be between 2 and 150 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters long.'),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
];
