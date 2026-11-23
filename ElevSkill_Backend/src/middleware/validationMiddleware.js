import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiResponse.js';

export function validateRequest(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return next(
      new ApiError(
        422,
        formatted[0]?.message || 'Validation failed.',
        'VALIDATION_ERROR',
        formatted
      )
    );
  }
  return next();
}
