import { getPool, sql } from '../config/database.js';
import { AI_SERVICE_CONFIG } from '../config/aiServices.js';
import { ApiError } from '../utils/ApiResponse.js';
import { callAiJsonEndpoint } from './aiClient.js';
import { logUserActivity } from './dashboardService.js';

function serializeSkill(row) {
  return {
    id: `sk-${row.SkillId}`,
    skillId: row.SkillId,
    roadmapId: row.RoadmapId,
    title: row.SkillName,
    category: row.Category,
    priority: row.Priority,
    hours: Number(row.EstimatedHours),
    status: row.Status,
    completed: row.Status === 'completed',
    alreadyKnown: Boolean(row.IsKnown),
    completedAt: row.CompletedAt,
  };
}

async function ensureActiveRoadmap(userId, targetRole = 'Software Engineer', experienceLevel = null) {
  const pool = await getPool();
  const existing = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT TOP 1 RoadmapId, TargetRole, ExperienceLevel, RoadmapMetaJson, CreatedAt, UpdatedAt
      FROM dbo.CareerRoadmaps
      WHERE UserId = @userId
      ORDER BY UpdatedAt DESC
    `);

  if (existing.recordset.length > 0) {
    return existing.recordset[0];
  }

  const inserted = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('targetRole', sql.NVarChar(150), targetRole || 'Software Engineer')
    .input('experienceLevel', sql.NVarChar(80), experienceLevel)
    .query(`
      INSERT INTO dbo.CareerRoadmaps (UserId, TargetRole, ExperienceLevel)
      OUTPUT INSERTED.*
      VALUES (@userId, @targetRole, @experienceLevel)
    `);
  return inserted.recordset[0];
}

export async function generateRoadmapViaAi(userId, requestData) {
  const cfg = AI_SERVICE_CONFIG.careerRoadmap;
  const aiResult = await callAiJsonEndpoint({
    serviceName: cfg.name,
    url: `${cfg.baseUrl}/generate`,
    body: requestData,
    timeoutMs: cfg.timeoutMs,
  });

  if (!aiResult || typeof aiResult.valid !== 'boolean') {
    throw new ApiError(502, 'Received an incomplete response from Career Roadmap.', 'AI_INVALID_RESPONSE');
  }

  const pool = await getPool();
  const roadmap = await ensureActiveRoadmap(
    userId,
    requestData.target_role || 'Software Engineer',
    requestData.experience_level || null
  );

  await pool
    .request()
    .input('roadmapId', sql.Int, roadmap.RoadmapId)
    .input('userId', sql.Int, userId)
    .input('targetRole', sql.NVarChar(150), requestData.target_role || roadmap.TargetRole)
    .input('experienceLevel', sql.NVarChar(80), requestData.experience_level || roadmap.ExperienceLevel)
    .input('metaJson', sql.NVarChar(sql.MAX), JSON.stringify(aiResult))
    .query(`
      UPDATE dbo.CareerRoadmaps
      SET TargetRole = @targetRole,
          ExperienceLevel = @experienceLevel,
          RoadmapMetaJson = @metaJson,
          UpdatedAt = SYSUTCDATETIME()
      WHERE RoadmapId = @roadmapId AND UserId = @userId
    `);

  return aiResult;
}

export async function getUserRoadmapAndSkills(userId) {
  const pool = await getPool();
  const roadmapRes = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT TOP 1 RoadmapId, TargetRole, ExperienceLevel, RoadmapMetaJson, CreatedAt, UpdatedAt
      FROM dbo.CareerRoadmaps
      WHERE UserId = @userId
      ORDER BY UpdatedAt DESC
    `);

  const roadmap = roadmapRes.recordset[0] || null;
  const skillsRes = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT SkillId, RoadmapId, SkillName, Category, Priority, Status, IsKnown, EstimatedHours, CompletedAt
      FROM dbo.RoadmapSkills
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `);

  const skills = skillsRes.recordset.map(serializeSkill);
  const completedCount = skills.filter((s) => s.status === 'completed').length;
  const inProgressCount = skills.filter((s) => s.status === 'in_progress').length;
  const totalCount = skills.length;

  return {
    roadmap: roadmap
      ? {
          roadmapId: roadmap.RoadmapId,
          targetRole: roadmap.TargetRole,
          experienceLevel: roadmap.ExperienceLevel,
          generatedPlan: roadmap.RoadmapMetaJson ? JSON.parse(roadmap.RoadmapMetaJson) : null,
          updatedAt: roadmap.UpdatedAt,
        }
      : null,
    skills,
    progress: {
      totalCount,
      completedCount,
      inProgressCount,
      percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
  };
}

export async function addRoadmapSkill(userId, { title, category = 'Programming', hours = 4, priority = 'Medium', alreadyKnown = false }) {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) {
    throw new ApiError(400, 'Skill title is required.', 'VALIDATION_ERROR');
  }

  const pool = await getPool();
  const existing = await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('skillName', sql.NVarChar(200), cleanTitle)
    .query('SELECT SkillId FROM dbo.RoadmapSkills WHERE UserId = @userId AND LOWER(SkillName) = LOWER(@skillName)');

  if (existing.recordset.length > 0) {
    throw new ApiError(409, `Skill "${cleanTitle}" is already in your roadmap.`, 'DUPLICATE_SKILL');
  }

  const roadmap = await ensureActiveRoadmap(userId);
  const estHours = Number.isFinite(Number(hours)) && Number(hours) > 0 ? Number(hours) : 4;

  const inserted = await pool
    .request()
    .input('roadmapId', sql.Int, roadmap.RoadmapId)
    .input('userId', sql.Int, userId)
    .input('skillName', sql.NVarChar(200), cleanTitle)
    .input('category', sql.NVarChar(100), category || 'Programming')
    .input('priority', sql.NVarChar(40), priority || 'Medium')
    .input('isKnown', sql.Bit, alreadyKnown ? 1 : 0)
    .input('hours', sql.Decimal(6, 2), estHours)
    .query(`
      INSERT INTO dbo.RoadmapSkills (RoadmapId, UserId, SkillName, Category, Priority, Status, IsKnown, EstimatedHours)
      OUTPUT INSERTED.*
      VALUES (@roadmapId, @userId, @skillName, @category, @priority, 'not_started', @isKnown, @hours)
    `);

  await logUserActivity(userId, {
    title: `Added roadmap skill "${cleanTitle}"`,
    category: 'Career Roadmap',
    badge: 'Added',
    variant: 'blue',
  });

  return serializeSkill(inserted.recordset[0]);
}

export async function syncRoadmapSkillsBatch(userId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { addedCount: 0, skills: [] };
  }

  const pool = await getPool();
  const roadmap = await ensureActiveRoadmap(userId);

  const existingRes = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query('SELECT SkillName FROM dbo.RoadmapSkills WHERE UserId = @userId');
  const existingSet = new Set(existingRes.recordset.map((r) => r.SkillName.trim().toLowerCase()));

  const added = [];
  for (const item of items) {
    const title = (item?.title || item?.skill || '').trim();
    const norm = title.toLowerCase();
    if (!norm || existingSet.has(norm)) continue;
    existingSet.add(norm);

    const estHours = Number.isFinite(Number(item.hours)) && Number(item.hours) > 0 ? Number(item.hours) : 4;
    const inserted = await pool
      .request()
      .input('roadmapId', sql.Int, roadmap.RoadmapId)
      .input('userId', sql.Int, userId)
      .input('skillName', sql.NVarChar(200), title)
      .input('category', sql.NVarChar(100), item.category || 'Programming')
      .input('priority', sql.NVarChar(40), item.priority || 'Medium')
      .input('hours', sql.Decimal(6, 2), estHours)
      .query(`
        INSERT INTO dbo.RoadmapSkills (RoadmapId, UserId, SkillName, Category, Priority, Status, IsKnown, EstimatedHours)
        OUTPUT INSERTED.*
        VALUES (@roadmapId, @userId, @skillName, @category, @priority, 'not_started', 0, @hours)
      `);
    added.push(serializeSkill(inserted.recordset[0]));
  }

  if (added.length > 0) {
    await logUserActivity(userId, {
      title: `Synced ${added.length} recommended skill(s) to Career Roadmap`,
      category: 'Career Roadmap',
      badge: `+${added.length} Skills`,
      variant: 'blue',
    });
  }

  return { addedCount: added.length, skills: added };
}

export async function updateRoadmapSkill(userId, skillId, { status, alreadyKnown }) {
  const pool = await getPool();
  const existingRes = await pool
    .request()
    .input('skillId', sql.Int, skillId)
    .input('userId', sql.Int, userId)
    .query('SELECT * FROM dbo.RoadmapSkills WHERE SkillId = @skillId AND UserId = @userId');

  const existing = existingRes.recordset[0];
  if (!existing) {
    throw new ApiError(404, 'Roadmap skill not found.', 'SKILL_NOT_FOUND');
  }

  const nextStatus = ['not_started', 'in_progress', 'completed'].includes(status)
    ? status
    : existing.Status;
  const nextKnown = alreadyKnown !== undefined ? (alreadyKnown ? 1 : 0) : existing.IsKnown ? 1 : 0;
  const completedAt = nextStatus === 'completed' ? new Date() : null;

  const updated = await pool
    .request()
    .input('skillId', sql.Int, skillId)
    .input('userId', sql.Int, userId)
    .input('status', sql.NVarChar(30), nextStatus)
    .input('isKnown', sql.Bit, nextKnown)
    .input('completedAt', sql.DateTime2, completedAt)
    .query(`
      UPDATE dbo.RoadmapSkills
      SET Status = @status,
          IsKnown = @isKnown,
          CompletedAt = @completedAt,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE SkillId = @skillId AND UserId = @userId
    `);

  if (status && status !== existing.Status) {
    const labelMap = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    await logUserActivity(userId, {
      title: `Updated "${existing.SkillName}" to ${labelMap[nextStatus]}`,
      category: 'Career Roadmap',
      badge: labelMap[nextStatus],
      variant: nextStatus === 'completed' ? 'success' : nextStatus === 'in_progress' ? 'blue' : 'neutral',
    });
  }

  return serializeSkill(updated.recordset[0]);
}

export async function deleteRoadmapSkill(userId, skillId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('skillId', sql.Int, skillId)
    .input('userId', sql.Int, userId)
    .query('DELETE FROM dbo.RoadmapSkills WHERE SkillId = @skillId AND UserId = @userId');
  if ((result.rowsAffected?.[0] || 0) === 0) {
    throw new ApiError(404, 'Roadmap skill not found.', 'SKILL_NOT_FOUND');
  }
}

export async function resetRoadmapSkills(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .query('DELETE FROM dbo.RoadmapSkills WHERE UserId = @userId');

  await logUserActivity(userId, {
    title: 'Cleared Career Roadmap checklist',
    category: 'Career Roadmap',
    badge: 'Cleared',
    variant: 'neutral',
  });
}
