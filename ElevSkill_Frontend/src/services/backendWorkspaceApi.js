import { apiRequest, getAuthToken, setAuthToken } from './apiClient.js';

export const backendAuthApi = {
  async register({ fullName, email, password }) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { fullName, email, password },
    });
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  async login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  async logout() {
    try {
      if (getAuthToken()) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } finally {
      setAuthToken(null);
    }
  },

  async me() {
    return apiRequest('/auth/me');
  },
};

export const backendWorkspaceApi = {
  getDashboard() {
    return apiRequest('/dashboard');
  },

  updateProfile(profile) {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: {
        fullName: profile.name || profile.fullName,
        education: profile.education,
        degree: profile.degree,
        institution: profile.institution,
        graduationYear: profile.graduationYear,
        targetRole: profile.targetRole,
        experienceLevel: profile.experienceLevel,
        skills: profile.skills,
        careerInterests: profile.careerInterests,
        emailNotifications: Boolean(profile.emailNotifications),
        onboardingDismissed: Boolean(profile.onboardingDismissed),
        themeVariant: profile.themeVariant || 'lavender',
      },
    });
  },

  resetWorkspace() {
    return apiRequest('/settings/reset', {
      method: 'POST',
      body: { confirm: true },
    });
  },

  listResumes() {
    return apiRequest('/resumes');
  },

  saveResume(payload) {
    return apiRequest('/resumes', { method: 'POST', body: payload });
  },

  updateResume(resumeId, patch) {
    return apiRequest(`/resumes/${resumeId}`, { method: 'PATCH', body: patch });
  },

  deleteResume(resumeId) {
    return apiRequest(`/resumes/${resumeId}`, { method: 'DELETE' });
  },

  listResumeDrafts() {
    return apiRequest('/resumes/drafts');
  },

  createResumeDraft(payload) {
    return apiRequest('/resumes/drafts', { method: 'POST', body: payload });
  },

  updateResumeDraft(draftId, payload) {
    return apiRequest(`/resumes/drafts/${draftId}`, { method: 'PATCH', body: payload });
  },

  listInterviewHistory() {
    return apiRequest('/interviews/history');
  },

  addSkill(skill) {
    return apiRequest('/roadmap/skills', { method: 'POST', body: skill });
  },

  syncSkills(skills) {
    return apiRequest('/roadmap/skills/sync', { method: 'POST', body: { skills } });
  },

  updateSkill(skillId, patch) {
    return apiRequest(`/roadmap/skills/${skillId}`, { method: 'PATCH', body: patch });
  },

  deleteSkill(skillId) {
    return apiRequest(`/roadmap/skills/${skillId}`, { method: 'DELETE' });
  },

  clearRoadmap() {
    return apiRequest('/roadmap/skills', { method: 'DELETE' });
  },

  async migrateLocalWorkspace({ profile, savedResumes, roadmapSkills }) {
    const tasks = [];
    if (profile && (profile.name || profile.targetRole || profile.education)) {
      tasks.push(this.updateProfile(profile).catch(() => null));
    }
    if (Array.isArray(savedResumes)) {
      for (const r of savedResumes) {
        if (r?.name && r?.text) {
          tasks.push(
            this.saveResume({
              name: r.name,
              text: r.text,
              lastScore: r.lastScore ?? null,
              classification: r.classification || '',
            }).catch(() => null)
          );
        }
      }
    }
    if (Array.isArray(roadmapSkills) && roadmapSkills.length > 0) {
      tasks.push(this.syncSkills(roadmapSkills).catch(() => null));
    }
    await Promise.all(tasks);
  },
};
