import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../config/database.js';
import { env } from '../config/environment.js';
import { ApiError } from '../utils/ApiResponse.js';

const BCRYPT_ROUNDS = 12;

export function serializeUser(row) {
  if (!row) return null;
  return {
    userId: row.UserId,
    fullName: row.FullName,
    name: row.FullName,
    email: row.Email,
    accountStatus: row.AccountStatus,
    education: row.Education || '',
    degree: row.Degree || '',
    institution: row.Institution || '',
    graduationYear: row.GraduationYear || '',
    targetRole: row.TargetRole || '',
    experienceLevel: row.ExperienceLevel || '',
    skills: row.Skills || '',
    careerInterests: row.CareerInterests || '',
    weeklyGoalHours: Number(row.WeeklyGoalHours ?? 0),
    emailNotifications: Boolean(row.EmailNotifications),
    studyReminders: Boolean(row.StudyReminders),
    onboardingDismissed: Boolean(row.OnboardingDismissed),
    themeVariant: row.ThemeVariant || 'lavender',
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

function signToken(userId, email) {
  return jwt.sign({ sub: String(userId), email }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

export async function findUserById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT UserId, FullName, Email, AccountStatus, Education, Degree, Institution,
             GraduationYear, TargetRole, ExperienceLevel, Skills, CareerInterests,
             WeeklyGoalHours, EmailNotifications, StudyReminders, OnboardingDismissed,
             ThemeVariant, CreatedAt, UpdatedAt
      FROM dbo.Users
      WHERE UserId = @userId
    `);
  return result.recordset[0] || null;
}

export async function registerUser({ fullName, email, password }) {
  const pool = await getPool();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await pool
    .request()
    .input('email', sql.NVarChar(255), normalizedEmail)
    .query('SELECT UserId FROM dbo.Users WHERE Email = @email');

  if (existing.recordset.length > 0) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const inserted = await pool
    .request()
    .input('fullName', sql.NVarChar(150), fullName.trim())
    .input('email', sql.NVarChar(255), normalizedEmail)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .query(`
      INSERT INTO dbo.Users (FullName, Email, PasswordHash)
      OUTPUT INSERTED.UserId, INSERTED.FullName, INSERTED.Email, INSERTED.AccountStatus,
             INSERTED.Education, INSERTED.Degree, INSERTED.Institution, INSERTED.GraduationYear,
             INSERTED.TargetRole, INSERTED.ExperienceLevel, INSERTED.Skills, INSERTED.CareerInterests,
             INSERTED.WeeklyGoalHours, INSERTED.EmailNotifications, INSERTED.StudyReminders,
             INSERTED.OnboardingDismissed, INSERTED.ThemeVariant, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@fullName, @email, @passwordHash)
    `);

  const user = inserted.recordset[0];
  const token = signToken(user.UserId, user.Email);
  return { user: serializeUser(user), token };
}

export async function loginUser({ email, password }) {
  const pool = await getPool();
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool
    .request()
    .input('email', sql.NVarChar(255), normalizedEmail)
    .query(`
      SELECT UserId, FullName, Email, PasswordHash, AccountStatus, Education, Degree, Institution,
             GraduationYear, TargetRole, ExperienceLevel, Skills, CareerInterests,
             WeeklyGoalHours, EmailNotifications, StudyReminders, OnboardingDismissed,
             ThemeVariant, CreatedAt, UpdatedAt
      FROM dbo.Users
      WHERE Email = @email
    `);

  const user = result.recordset[0];
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  if (user.AccountStatus !== 'active') {
    throw new ApiError(403, 'This account is currently inactive.', 'ACCOUNT_INACTIVE');
  }

  const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
  if (!passwordMatch) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const token = signToken(user.UserId, user.Email);
  return { user: serializeUser(user), token };
}

export async function updateUserProfile(userId, payload) {
  const pool = await getPool();
  const current = await findUserById(userId);
  if (!current) {
    throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');
  }

  const nextFullName = (payload.fullName ?? payload.name ?? current.FullName).trim() || current.FullName;

  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('fullName', sql.NVarChar(150), nextFullName)
    .input('education', sql.NVarChar(150), payload.education ?? current.Education)
    .input('degree', sql.NVarChar(150), payload.degree ?? current.Degree)
    .input('institution', sql.NVarChar(200), payload.institution ?? current.Institution)
    .input('graduationYear', sql.NVarChar(20), payload.graduationYear ?? current.GraduationYear)
    .input('targetRole', sql.NVarChar(150), payload.targetRole ?? current.TargetRole)
    .input('experienceLevel', sql.NVarChar(80), payload.experienceLevel ?? current.ExperienceLevel)
    .input('skills', sql.NVarChar(sql.MAX), payload.skills ?? current.Skills)
    .input('careerInterests', sql.NVarChar(sql.MAX), payload.careerInterests ?? current.CareerInterests)
    .input(
      'weeklyGoalHours',
      sql.Decimal(5, 2),
      payload.weeklyGoalHours !== undefined ? Number(payload.weeklyGoalHours) : Number(current.WeeklyGoalHours ?? 0)
    )
    .input(
      'emailNotifications',
      sql.Bit,
      payload.emailNotifications !== undefined ? (payload.emailNotifications ? 1 : 0) : (current.EmailNotifications ? 1 : 0)
    )
    .input(
      'studyReminders',
      sql.Bit,
      payload.studyReminders !== undefined ? (payload.studyReminders ? 1 : 0) : (current.StudyReminders ? 1 : 0)
    )
    .input(
      'onboardingDismissed',
      sql.Bit,
      payload.onboardingDismissed !== undefined ? (payload.onboardingDismissed ? 1 : 0) : (current.OnboardingDismissed ? 1 : 0)
    )
    .input('themeVariant', sql.NVarChar(30), payload.themeVariant ?? current.ThemeVariant ?? 'lavender')
    .query(`
      UPDATE dbo.Users
      SET FullName = @fullName,
          Education = @education,
          Degree = @degree,
          Institution = @institution,
          GraduationYear = @graduationYear,
          TargetRole = @targetRole,
          ExperienceLevel = @experienceLevel,
          Skills = @skills,
          CareerInterests = @careerInterests,
          WeeklyGoalHours = @weeklyGoalHours,
          EmailNotifications = @emailNotifications,
          StudyReminders = @studyReminders,
          OnboardingDismissed = @onboardingDismissed,
          ThemeVariant = @themeVariant,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.UserId, INSERTED.FullName, INSERTED.Email, INSERTED.AccountStatus,
             INSERTED.Education, INSERTED.Degree, INSERTED.Institution, INSERTED.GraduationYear,
             INSERTED.TargetRole, INSERTED.ExperienceLevel, INSERTED.Skills, INSERTED.CareerInterests,
             INSERTED.WeeklyGoalHours, INSERTED.EmailNotifications, INSERTED.StudyReminders,
             INSERTED.OnboardingDismissed, INSERTED.ThemeVariant, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE UserId = @userId
    `);

  return serializeUser(result.recordset[0]);
}

export async function resetUserWorkspaceData(userId) {
  const pool = await getPool();
  const transaction = pool.transaction();
  await transaction.begin();
  try {
    const req = () => transaction.request().input('userId', sql.Int, userId);
    await req().query('DELETE FROM dbo.ActivityLogs WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.StudyActivity WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.RoadmapSkills WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.CareerRoadmaps WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.JobMatchHistory WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.InterviewHistory WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.ResumeAnalyses WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.ResumeDrafts WHERE UserId = @userId');
    await req().query('DELETE FROM dbo.ResumeVault WHERE UserId = @userId');
    await req().query(`
      UPDATE dbo.Users
      SET Education = NULL,
          Degree = NULL,
          Institution = NULL,
          GraduationYear = NULL,
          TargetRole = NULL,
          ExperienceLevel = NULL,
          Skills = NULL,
          CareerInterests = NULL,
          WeeklyGoalHours = 0,
          EmailNotifications = 0,
          StudyReminders = 0,
          OnboardingDismissed = 0,
          ThemeVariant = 'lavender',
          UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @userId
    `);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
