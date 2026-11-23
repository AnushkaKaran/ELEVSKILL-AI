import { EMPTY_PROFILE } from '../data/sampleData.js';

export const STORAGE_KEYS = {
  PROFILE: 'careerpilot_v2_profile',
  SKILLS: 'careerpilot_v2_skills',
  RESUME_ANALYSIS: 'careerpilot_v2_resume_analysis',
  SAVED_RESUMES: 'elevskill_v1_saved_resumes',
  JOB_MATCH: 'careerpilot_v2_job_match',
  INTERVIEW_SESSION: 'careerpilot_v2_interview_session',
  INTERVIEW_HISTORY: 'elevskill_v1_interview_history',
  ACTIVITY: 'careerpilot_v2_activity',
  BUILDER_DRAFT: 'elevskill_v1_builder_draft',
};

const ACTIVE_GUEST_SESSION_KEY = 'elevskill_active_guest_session_id';

function generateGuestSessionId() {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getActiveGuestSessionId(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return 'default';
  try {
    let sessionId = storage.getItem(ACTIVE_GUEST_SESSION_KEY);
    if (!sessionId) {
      sessionId = generateGuestSessionId();
      storage.setItem(ACTIVE_GUEST_SESSION_KEY, sessionId);
      // One-time migration of legacy un-scoped guest keys into the initial guest session
      Object.values(STORAGE_KEYS).forEach((legacyKey) => {
        const legacyVal = storage.getItem(legacyKey);
        if (legacyVal !== null) {
          storage.setItem(`elevskill_guest_${sessionId}_${legacyKey}`, legacyVal);
          storage.removeItem(legacyKey);
        }
      });
    }
    return sessionId;
  } catch {
    return 'default';
  }
}

export function getScopedStorageKey(baseKey, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const sessionId = getActiveGuestSessionId(storage);
  return `elevskill_guest_${sessionId}_${baseKey}`;
}

export function clearGuestSessionStorage(
  sessionId = null,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) {
  if (!storage) return;
  const targetId = sessionId || getActiveGuestSessionId(storage);
  [...Object.values(STORAGE_KEYS), 'careerpilot_v2_study_sessions'].forEach((baseKey) => {
    try {
      storage.removeItem(`elevskill_guest_${targetId}_${baseKey}`);
      storage.removeItem(baseKey);
    } catch {
      // ignore
    }
  });
}

export function startNewGuestSession(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return 'default';
  const prevId = storage.getItem(ACTIVE_GUEST_SESSION_KEY);
  if (prevId) {
    clearGuestSessionStorage(prevId, storage);
  }
  const nextId = generateGuestSessionId();
  try {
    storage.setItem(ACTIVE_GUEST_SESSION_KEY, nextId);
  } catch {
    // ignore
  }
  return nextId;
}

const VALID_THEMES = new Set(['lavender', 'blossom', 'sky']);

export function safeReadStorage(key, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return null;
  try {
    const scopedKey = getScopedStorageKey(key, storage);
    const raw = storage.getItem(scopedKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function safeWriteStorage(key, value, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return;
  try {
    const scopedKey = getScopedStorageKey(key, storage);
    if (value === null || value === undefined) {
      storage.removeItem(scopedKey);
    } else {
      storage.setItem(scopedKey, JSON.stringify(value));
    }
  } catch {
    // Ignore quota or storage errors cleanly
  }
}

export function loadUserProfile(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.PROFILE, storage);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...EMPTY_PROFILE };
  }

  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    email: typeof parsed.email === 'string' ? parsed.email : '',
    education: typeof parsed.education === 'string' ? parsed.education : '',
    degree: typeof parsed.degree === 'string' ? parsed.degree : '',
    institution: typeof parsed.institution === 'string' ? parsed.institution : '',
    graduationYear: typeof parsed.graduationYear === 'string' ? parsed.graduationYear : '',
    targetRole: typeof parsed.targetRole === 'string' ? parsed.targetRole : '',
    experienceLevel: typeof parsed.experienceLevel === 'string' ? parsed.experienceLevel : '',
    skills: typeof parsed.skills === 'string' ? parsed.skills : '',
    careerInterests: typeof parsed.careerInterests === 'string' ? parsed.careerInterests : '',
    emailNotifications: Boolean(parsed.emailNotifications),
    onboardingDismissed: Boolean(parsed.onboardingDismissed),
    themeVariant: VALID_THEMES.has(parsed.themeVariant) ? parsed.themeVariant : 'lavender',
  };
}

const VALID_SKILL_STATUSES = new Set(['not_started', 'in_progress', 'completed']);

export function normalizeSkillStatus(item) {
  if (item && VALID_SKILL_STATUSES.has(item.status)) {
    return item.status;
  }
  return item?.completed ? 'completed' : 'not_started';
}

export function loadRoadmapSkills(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.SKILLS, storage);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  const valid = parsed.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      item.title.trim().length > 0
  );

  if (valid.length === 0) {
    return [];
  }

  return valid.map((item) => {
    const status = normalizeSkillStatus(item);
    return {
      id: item.id,
      title: item.title,
      category: typeof item.category === 'string' && item.category ? item.category : 'General',
      priority: typeof item.priority === 'string' && item.priority ? item.priority : 'Medium',
      hours: typeof item.hours === 'number' && Number.isFinite(item.hours) && item.hours > 0 ? item.hours : 4,
      status,
      completed: status === 'completed',
      alreadyKnown: Boolean(item.alreadyKnown),
    };
  });
}

export function loadLatestResumeAnalysis(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.RESUME_ANALYSIS, storage);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.score !== 'number' ||
    typeof parsed.analyzedAt !== 'string'
  ) {
    return null;
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    analyzedAt: parsed.analyzedAt,
    status: typeof parsed.status === 'string' ? parsed.status : getResumeStatusLabel(parsed.score),
    wordCount: typeof parsed.wordCount === 'number' ? parsed.wordCount : 0,
  };
}

export function loadLatestJobMatch(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.JOB_MATCH, storage);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.matchPercent !== 'number' ||
    typeof parsed.comparedAt !== 'string'
  ) {
    return null;
  }
  return {
    matchPercent: Math.max(0, Math.min(100, Math.round(parsed.matchPercent))),
    readiness: typeof parsed.readiness === 'string' ? parsed.readiness : 'Evaluated',
    comparedAt: parsed.comparedAt,
  };
}

export function loadLatestInterviewSession(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.INTERVIEW_SESSION, storage);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.score !== 'number' ||
    typeof parsed.practicedAt !== 'string'
  ) {
    return null;
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    category: typeof parsed.category === 'string' ? parsed.category : 'behavioral',
    practicedAt: parsed.practicedAt,
    totalPracticed: typeof parsed.totalPracticed === 'number' ? parsed.totalPracticed : 1,
  };
}

export function loadSavedResumes(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.SAVED_RESUMES, storage);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      typeof r.text === 'string'
  );
}

export function loadInterviewHistory(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.INTERVIEW_HISTORY, storage);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.category === 'string' &&
      typeof item.score === 'number'
  );
}

export function loadActivityLog(storage) {
  const parsed = safeReadStorage(STORAGE_KEYS.ACTIVITY, storage);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.category === 'string'
  );
}

export function clearAllUserData(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  clearGuestSessionStorage(null, storage);
}

export function isProfileComplete(profile) {
  if (!profile) return false;
  return Boolean(
    profile.name?.trim() &&
      profile.education?.trim() &&
      profile.targetRole?.trim() &&
      profile.experienceLevel?.trim()
  );
}

export function calculateRoadmapProgress(skills) {
  const list = Array.isArray(skills) ? skills : [];
  const totalCount = list.length;
  let completedCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let knownCount = 0;
  let totalHours = 0;
  let remainingHours = 0;

  const categoryMap = new Map();
  list.forEach((skill) => {
    const status = normalizeSkillStatus(skill);
    const hours = typeof skill.hours === 'number' && skill.hours > 0 ? skill.hours : 4;
    const isCompleted = status === 'completed';

    if (isCompleted) {
      completedCount += 1;
    } else if (status === 'in_progress') {
      inProgressCount += 1;
    } else {
      notStartedCount += 1;
    }
    if (skill.alreadyKnown) {
      knownCount += 1;
    }

    totalHours += hours;
    if (!isCompleted && !skill.alreadyKnown) {
      remainingHours += hours;
    }

    const cat = skill.category || 'General';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { category: cat, total: 0, completed: 0 });
    }
    const entry = categoryMap.get(cat);
    entry.total += 1;
    if (isCompleted) entry.completed += 1;
  });

  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = Array.from(categoryMap.values()).map((entry) => ({
    ...entry,
    percent: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
  }));

  return {
    completedCount,
    inProgressCount,
    notStartedCount,
    knownCount,
    totalCount,
    overallPercent,
    totalHours,
    remainingHours,
    categories,
  };
}

export function getResumeStatusLabel(score) {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Moderate';
  return 'Needs Work';
}

export function getLocalTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekBounds(referenceDate = new Date()) {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dayOfWeek = ref.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(ref);
  start.setDate(ref.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isDateInBounds(dateStr, start, end) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false;
  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed >= start && parsed <= end;
}

export function isDateInCurrentWeek(dateStr, referenceDate = new Date()) {
  const { start, end } = getCurrentWeekBounds(referenceDate);
  return isDateInBounds(dateStr, start, end);
}

export function formatDateShort(isoOrDateStr) {
  if (!isoOrDateStr) return '';
  const date = new Date(isoOrDateStr);
  if (Number.isNaN(date.getTime())) return isoOrDateStr;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
