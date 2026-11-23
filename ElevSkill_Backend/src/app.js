import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/environment.js';
import { checkDatabaseHealth } from './config/database.js';
import { checkAllAiServicesHealth } from './config/aiServices.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import jobMatcherRoutes from './routes/jobMatcherRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  const allowedOrigins = env.frontendUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.',
      },
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/api/health', async (req, res) => {
    const includeAi = req.query.checkAi !== 'false';
    const [database, aiServices] = await Promise.all([
      checkDatabaseHealth(),
      includeAi ? checkAllAiServicesHealth() : Promise.resolve(null),
    ]);

    const statusCode = database.connected ? 200 : 503;

    res.status(statusCode).json({
      success: database.connected,
      status: database.connected ? 'ok' : 'degraded',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      database,
      ...(aiServices ? { aiServices } : {}),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/job-matcher', jobMatcherRoutes);
  app.use('/api/roadmap', roadmapRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
