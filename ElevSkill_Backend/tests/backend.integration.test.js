import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { closePool, getPool, sql } from '../src/config/database.js';

const testEmails = [];

async function cleanupTestUsers() {
  if (testEmails.length === 0) return;
  try {
    const pool = await getPool();
    for (const email of testEmails) {
      await pool
        .request()
        .input('email', sql.NVarChar(255), email)
        .query('DELETE FROM dbo.Users WHERE Email = @email');
    }
  } catch {
    // ignore cleanup errors
  } finally {
    await closePool();
  }
}

afterAll(async () => {
  await cleanupTestUsers();
});

describe('ELEVSKILL Backend Integration Tests (SQL Server)', () => {
  const uniqueSuffix = Date.now();
  const userAEmail = `test-user-a-${uniqueSuffix}@example.com`;
  const userBEmail = `test-user-b-${uniqueSuffix}@example.com`;
  testEmails.push(userAEmail, userBEmail);

  let tokenA = '';
  let tokenB = '';
  let resumeIdA = null;
  let skillIdA = null;

  it('GET /api/health reports connected SQL Server database', async () => {
    const res = await request(app).get('/api/health?checkAi=false');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.database.connected).toBe(true);
    expect(res.body.database.database).toBe('ELEVSKILL_AI_DB');
  });

  it('registers User A and User B without exposing password hashes', async () => {
    const resA = await request(app).post('/api/auth/register').send({
      fullName: 'Alice Candidate',
      email: userAEmail,
      password: 'Password123!',
    });
    expect(resA.status).toBe(201);
    expect(resA.body.data.token).toBeTruthy();
    expect(resA.body.data.user.email).toBe(userAEmail);
    expect(resA.body.data.user.passwordHash).toBeUndefined();
    expect(resA.body.data.user.PasswordHash).toBeUndefined();
    tokenA = resA.body.data.token;

    const resB = await request(app).post('/api/auth/register').send({
      fullName: 'Bob Candidate',
      email: userBEmail,
      password: 'Password123!',
    });
    expect(resB.status).toBe(201);
    tokenB = resB.body.data.token;
  });

  it('rejects duplicate email registration and invalid login', async () => {
    const dup = await request(app).post('/api/auth/register').send({
      fullName: 'Alice Duplicate',
      email: userAEmail,
      password: 'Password123!',
    });
    expect(dup.status).toBe(409);

    const badLogin = await request(app).post('/api/auth/login').send({
      email: userAEmail,
      password: 'WrongPassword!',
    });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app).post('/api/auth/login').send({
      email: userAEmail,
      password: 'Password123!',
    });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.token).toBeTruthy();
  });

  it('enforces authentication on protected routes', async () => {
    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);

    const authed = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(authed.status).toBe(200);
    expect(authed.body.data.user.email).toBe(userAEmail);
  });

  it('allows optional profile & settings updates', async () => {
    const profileRes = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        targetRole: 'Frontend Engineer',
        themeVariant: 'sky',
      });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.profile.targetRole).toBe('Frontend Engineer');
    expect(profileRes.body.data.profile.themeVariant).toBe('sky');
  });

  it('supports Resume Vault CRUD and isolates records between User A and User B', async () => {
    const createRes = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Alice Frontend Resume',
        text: 'React, JavaScript, TypeScript, CSS, Node.js, REST APIs, Git, Testing.',
        lastScore: 84,
        classification: 'Frontend Developer',
      });
    expect(createRes.status).toBe(201);
    resumeIdA = createRes.body.data.resume.resumeId;

    const listA = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data.resumes.length).toBe(1);

    const listB = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data.resumes.length).toBe(0);

    const stealB = await request(app)
      .get(`/api/resumes/${resumeIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stealB.status).toBe(404);

    const deleteB = await request(app)
      .delete(`/api/resumes/${resumeIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(deleteB.status).toBe(404);
  });

  it('supports Career Roadmap CRUD + Dashboard aggregation and returns 404 for removed /api/study', async () => {
    const skillRes = await request(app)
      .post('/api/roadmap/skills')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'React Hooks', category: 'Frameworks', hours: 6, priority: 'High' });
    expect(skillRes.status).toBe(201);
    skillIdA = skillRes.body.data.skill.skillId;

    const patchSkill = await request(app)
      .patch(`/api/roadmap/skills/${skillIdA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'completed' });
    expect(patchSkill.status).toBe(200);
    expect(patchSkill.body.data.skill.status).toBe('completed');

    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.stats.savedResumesCount).toBe(1);
    expect(dashRes.body.data.stats.roadmapCompletedSkills).toBe(1);
    expect(dashRes.body.data.studySessions).toBeUndefined();

    const removedStudy = await request(app)
      .get('/api/study')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(removedStudy.status).toBe(404);
  });

  it('requires confirmation to reset user data and clears records when confirmed', async () => {
    const unconfirmed = await request(app)
      .post('/api/settings/reset')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});
    expect(unconfirmed.status).toBe(400);

    const confirmed = await request(app)
      .post('/api/settings/reset')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ confirm: true });
    expect(confirmed.status).toBe(200);

    const dashAfter = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(dashAfter.status).toBe(200);
    expect(dashAfter.body.data.stats.savedResumesCount).toBe(0);
    expect(dashAfter.body.data.stats.roadmapTotalSkills).toBe(0);
  });
});
