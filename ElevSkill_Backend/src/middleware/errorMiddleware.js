import { ApiError } from '../utils/ApiResponse.js';
import { env } from '../config/environment.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      code: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the maximum allowed size (10 MB).',
    });
  }

  const statusCode = err?.statusCode || err?.status || 500;
  const message =
    statusCode >= 500 && env.nodeEnv === 'production'
      ? 'An unexpected internal server error occurred.'
      : err?.message || 'An unexpected internal server error occurred.';

  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error('[ErrorHandler]', err?.message || err);
  }

  return res.status(statusCode).json({
    success: false,
    code: err?.code || 'INTERNAL_ERROR',
    message,
  });
}
