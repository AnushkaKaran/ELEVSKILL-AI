import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { ApiError } from '../utils/ApiResponse.js';
import { findUserById } from '../services/authService.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required.', 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new ApiError(401, 'Authentication token is missing.', 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch {
      throw new ApiError(401, 'Invalid or expired authentication token.', 'INVALID_TOKEN');
    }

    const userId = Number(decoded?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ApiError(401, 'Invalid authentication token payload.', 'INVALID_TOKEN');
    }

    const user = await findUserById(userId);
    if (!user || user.AccountStatus !== 'active') {
      throw new ApiError(401, 'User account not found or inactive.', 'UNAUTHORIZED');
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
