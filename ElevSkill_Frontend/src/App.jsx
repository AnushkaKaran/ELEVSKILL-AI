import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { getAuthToken, setAuthToken } from './services/apiClient';
import { backendAuthApi, backendWorkspaceApi } from './services/backendWorkspaceApi';
import { Dashboard } from './pages/Dashboard';
import { ResumeAnalyzer } from './pages/ResumeAnalyzer';
import { ResumeVault } from './pages/ResumeVault';
import { ResumeBuilder } from './pages/ResumeBuilder';
import { InterviewCoach } from './pages/InterviewCoach';
import { CareerRoadmap } from './pages/CareerRoadmap';
import { JobMatcher } from './pages/JobMatcher';
import { Settings } from './pages/Settings';
import { EMPTY_PROFILE } from './data/sampleData';
import {
  STORAGE_KEYS,
  safeWriteStorage,
  loadUserProfile,
  loadRoadmapSkills,
  loadLatestResumeAnalysis,
  loadSavedResumes,
  loadLatestJobMatch,
  loadLatestInterviewSession,
  loadInterviewHistory,
  loadActivityLog,
  clearAllUserData,
  startNewGuestSession,
  isProfileComplete,
  formatDateShort,
} from './utils/dashboardStore';

const PAGE_META = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of your career readiness and recent activity',
  },
  resume: {
    title: 'Resume Analyzer',
    subtitle: 'Upload a PDF or paste text to evaluate structure, skills, and job alignment',
  },
  vault: {
    title: 'Resume Vault',
    subtitle: 'Manage, reanalyze, copy, or download your explicitly saved resumes',
  },
  builder: {
    title: 'Resume Builder',
    subtitle: 'Edit structured resume sections, pick a template, and export a polished PDF',
  },
  interview: {
    title: 'Interview Coach',
    subtitle: 'Practice behavioral and technical questions across 17 domains',
  },
  roadmap: {
    title: 'Career Roadmap',
    subtitle: 'Track essential skills and review recommended next steps',
  },
  matcher: {
    title: 'Job Matcher',
    subtitle: 'Compare your resume side-by-side against a target job description',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your profile preferences and privacy settings',
  },
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userProfile, setUserProfile] = useState(() => loadUserProfile());
  const [roadmapSkills, setRoadmapSkills] = useState(() => loadRoadmapSkills());
  const [latestResumeAnalysis, setLatestResumeAnalysis] = useState(() =>
    loadLatestResumeAnalysis()
  );
  const [latestJobMatch, setLatestJobMatch] = useState(() => loadLatestJobMatch());
  const [latestInterviewSession, setLatestInterviewSession] = useState(() =>
    loadLatestInterviewSession()
  );
  const [interviewHistory, setInterviewHistory] = useState(() => loadInterviewHistory());
  const [savedResumes, setSavedResumes] = useState(() => loadSavedResumes());
  const [sharedResumeText, setSharedResumeText] = useState('');
  const [sharedMatcherText, setSharedMatcherText] = useState('');
  const [sharedBuilderText, setSharedBuilderText] = useState('');
  const [activityLog, setActivityLog] = useState(() => loadActivityLog());
  const [authUser, setAuthUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const hydrateFromBackend = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const [dashData, resumesData, interviewData] = await Promise.all([
        backendWorkspaceApi.getDashboard(),
        backendWorkspaceApi.listResumes(),
        backendWorkspaceApi.listInterviewHistory(),
      ]);

      if (dashData?.profile) {
        setAuthUser(dashData.profile);
        setUserProfile({ ...EMPTY_PROFILE, ...dashData.profile });
      }
      if (Array.isArray(dashData?.roadmapSkills)) {
        setRoadmapSkills(dashData.roadmapSkills);
      }
      if (dashData?.latestResumeAnalysis !== undefined) {
        setLatestResumeAnalysis(dashData.latestResumeAnalysis);
      }
      if (dashData?.latestJobMatch !== undefined) {
        setLatestJobMatch(dashData.latestJobMatch);
      }
      if (dashData?.latestInterviewSession !== undefined) {
        setLatestInterviewSession(dashData.latestInterviewSession);
      }
      if (Array.isArray(dashData?.activityLog)) {
        setActivityLog(
          dashData.activityLog.map((item) => ({
            ...item,
            timeLabel: formatDateShort(item.createdAt),
          }))
        );
      }
      if (Array.isArray(resumesData?.resumes)) {
        setSavedResumes(resumesData.resumes);
      }
      if (Array.isArray(interviewData?.history)) {
        setInterviewHistory(
          interviewData.history.map((item) => ({
            ...item,
            timeLabel: formatDateShort(item.practicedAt),
          }))
        );
      }
    } catch {
      setAuthToken(null);
      setAuthUser(null);
    }
  }, []);

  useEffect(() => {
    hydrateFromBackend();
  }, [hydrateFromBackend]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', userProfile.themeVariant || 'lavender');
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.PROFILE, userProfile);
    }
  }, [userProfile, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.SKILLS, roadmapSkills);
    }
  }, [roadmapSkills, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.RESUME_ANALYSIS, latestResumeAnalysis);
    }
  }, [latestResumeAnalysis, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.JOB_MATCH, latestJobMatch);
    }
  }, [latestJobMatch, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.INTERVIEW_SESSION, latestInterviewSession);
    }
  }, [latestInterviewSession, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.INTERVIEW_HISTORY, interviewHistory);
    }
  }, [interviewHistory, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.SAVED_RESUMES, savedResumes);
    }
  }, [savedResumes, authUser]);

  useEffect(() => {
    if (!authUser && !getAuthToken()) {
      safeWriteStorage(STORAGE_KEYS.ACTIVITY, activityLog);
    }
  }, [activityLog, authUser]);

  const logActivity = ({ title, category, badge, variant = 'neutral' }) => {
    const now = new Date().toISOString();
    const entry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      category,
      createdAt: now,
      timeLabel: formatDateShort(now),
      badge,
      variant,
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, 15));
  };

  const handleToggleSkill = (skillId) => {
    const targetSkill = roadmapSkills.find((s) => s.id === skillId);
    if (!targetSkill) return;

    const nextCompleted = !targetSkill.completed;
    const nextStatus = nextCompleted ? 'completed' : 'not_started';
    setRoadmapSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, completed: nextCompleted, status: nextStatus } : skill
      )
    );
    if (authUser) {
      backendWorkspaceApi.updateSkill(skillId, { status: nextStatus }).catch(() => {});
    }

    if (nextCompleted) {
      logActivity({
        title: `Completed roadmap skill "${targetSkill.title}"`,
        category: 'Career Roadmap',
        badge: 'Completed',
        variant: 'success',
      });
    } else {
      logActivity({
        title: `Marked roadmap skill "${targetSkill.title}" as Not Started`,
        category: 'Career Roadmap',
        badge: 'Not Started',
        variant: 'neutral',
      });
    }
  };

  const handleSetSkillStatus = (skillId, nextStatus) => {
    const targetSkill = roadmapSkills.find((s) => s.id === skillId);
    if (!targetSkill) return;
    const validStatus = ['not_started', 'in_progress', 'completed'].includes(nextStatus)
      ? nextStatus
      : 'not_started';
    const nextCompleted = validStatus === 'completed';

    setRoadmapSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, status: validStatus, completed: nextCompleted } : skill
      )
    );
    if (authUser) {
      backendWorkspaceApi.updateSkill(skillId, { status: validStatus }).catch(() => {});
    }

    const labelMap = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    logActivity({
      title: `Updated "${targetSkill.title}" to ${labelMap[validStatus]}`,
      category: 'Career Roadmap',
      badge: labelMap[validStatus],
      variant: validStatus === 'completed' ? 'success' : validStatus === 'in_progress' ? 'blue' : 'neutral',
    });
  };

  const handleToggleKnownSkill = (skillId) => {
    const targetSkill = roadmapSkills.find((s) => s.id === skillId);
    if (!targetSkill) return;
    const nextKnown = !targetSkill.alreadyKnown;
    setRoadmapSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, alreadyKnown: nextKnown } : skill
      )
    );
    if (authUser) {
      backendWorkspaceApi.updateSkill(skillId, { alreadyKnown: nextKnown }).catch(() => {});
    }
  };

  const handleAddSkill = ({ title, category, hours = 4, priority = 'Medium', alreadyKnown = false }) => {
    const normalized = title.trim().toLowerCase();
    if (!normalized) return false;
    const exists = roadmapSkills.some((s) => s.title.trim().toLowerCase() === normalized);
    if (exists) return false;

    const newSkill = {
      id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: title.trim(),
      category: category || 'Programming',
      priority,
      hours: Number.isFinite(Number(hours)) && Number(hours) > 0 ? Number(hours) : 4,
      status: 'not_started',
      completed: false,
      alreadyKnown: Boolean(alreadyKnown),
    };
    setRoadmapSkills((prev) => [newSkill, ...prev]);
    if (authUser) {
      backendWorkspaceApi
        .addSkill({
          title: newSkill.title,
          category: newSkill.category,
          hours: newSkill.hours,
          priority: newSkill.priority,
          alreadyKnown: newSkill.alreadyKnown,
        })
        .then((res) => {
          if (res?.skill) {
            setRoadmapSkills((prev) =>
              prev.map((s) => (s.id === newSkill.id ? res.skill : s))
            );
          }
        })
        .catch(() => {});
    }
    logActivity({
      title: `Added roadmap skill "${newSkill.title}"`,
      category: 'Career Roadmap',
      badge: 'Added',
      variant: 'blue',
    });
    return true;
  };

  const handleAddSkillsBatch = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const existing = new Set(roadmapSkills.map((s) => s.title.trim().toLowerCase()));
    const toAdd = [];
    items.forEach((item, idx) => {
      const title = (item.title || item.skill || '').trim();
      const norm = title.toLowerCase();
      if (!norm || existing.has(norm)) return;
      existing.add(norm);
      toAdd.push({
        id: `sk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        title,
        category: item.category || 'Programming',
        priority: item.priority || 'Medium',
        hours: Number.isFinite(Number(item.hours)) && Number(item.hours) > 0 ? Number(item.hours) : 4,
        status: 'not_started',
        completed: false,
        alreadyKnown: false,
      });
    });
    if (toAdd.length === 0) return 0;
    setRoadmapSkills((prev) => [...toAdd, ...prev]);
    if (authUser) {
      backendWorkspaceApi.syncSkills(toAdd).then(() => hydrateFromBackend()).catch(() => {});
    }
    logActivity({
      title: `Synced ${toAdd.length} recommended skill(s) to Career Roadmap`,
      category: 'Career Roadmap',
      badge: `+${toAdd.length} Skills`,
      variant: 'blue',
    });
    return toAdd.length;
  };

  const handleResetSkills = () => {
    setRoadmapSkills([]);
    if (authUser) {
      backendWorkspaceApi.clearRoadmap().catch(() => {});
    }
    logActivity({
      title: 'Cleared Career Roadmap checklist',
      category: 'Career Roadmap',
      badge: 'Cleared',
      variant: 'neutral',
    });
  };

  const handleDeleteSkill = (skillId) => {
    const targetSkill = roadmapSkills.find((s) => s.id === skillId);
    if (!targetSkill) return;
    setRoadmapSkills((prev) => prev.filter((s) => s.id !== skillId));
    if (authUser) {
      backendWorkspaceApi.deleteSkill(skillId).catch(() => {});
    }
    logActivity({
      title: `Removed roadmap skill "${targetSkill.title}"`,
      category: 'Career Roadmap',
      badge: 'Removed',
      variant: 'neutral',
    });
  };

  const handleRecordResumeAnalysis = (analysisSummary) => {
    setLatestResumeAnalysis(analysisSummary);
    logActivity({
      title: `Completed resume analysis (${analysisSummary.score}/100 · ${analysisSummary.status})`,
      category: 'Resume Analyzer',
      badge: `${analysisSummary.score}%`,
      variant: analysisSummary.score >= 75 ? 'success' : 'blue',
    });
  };

  const handleRecordJobMatch = (matchSummary) => {
    setLatestJobMatch(matchSummary);
    logActivity({
      title: `Completed job matching (${matchSummary.matchPercent}% keyword overlap)`,
      category: 'Job Matcher',
      badge: `${matchSummary.matchPercent}% Match`,
      variant: matchSummary.matchPercent >= 65 ? 'success' : 'blue',
    });
  };

  const handleSaveProfile = (updatedProfile) => {
    setUserProfile(updatedProfile);
    if (authUser) {
      backendWorkspaceApi.updateProfile(updatedProfile).catch(() => {});
    }
    logActivity({
      title: updatedProfile.targetRole
        ? `Updated profile for ${updatedProfile.targetRole}`
        : 'Updated user profile preferences',
      category: 'Settings',
      badge: 'Saved',
      variant: 'success',
    });
  };

  const handleRecordInterviewSession = ({ score, category, questionText = '' }) => {
    const now = new Date().toISOString();
    setLatestInterviewSession((prev) => ({
      score: Math.round(score),
      category,
      practicedAt: now,
      totalPracticed: (prev?.totalPracticed || 0) + 1,
    }));
    setInterviewHistory((prev) =>
      [
        {
          id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          score: Math.round(score),
          category,
          questionText,
          practicedAt: now,
          timeLabel: formatDateShort(now),
        },
        ...prev,
      ].slice(0, 30)
    );
  };

  const handleSaveResumeToVault = ({
    name,
    text,
    lastScore = null,
    classification = '',
    originalFileName = null,
    originalFileDataUrl = null,
  }) => {
    const now = new Date().toISOString();
    const entry = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      text,
      lastScore,
      classification,
      originalFileName,
      originalFileDataUrl,
      savedAt: now,
      updatedAt: now,
    };
    setSavedResumes((prev) => [entry, ...prev]);
    if (authUser) {
      backendWorkspaceApi
        .saveResume({
          name,
          text,
          lastScore,
          classification,
          originalFileName,
        })
        .then((res) => {
          if (res?.resume) {
            setSavedResumes((prev) =>
              prev.map((r) => (r.id === entry.id ? res.resume : r))
            );
          }
        })
        .catch(() => {});
    }
    logActivity({
      title: `Saved resume "${name}" to Resume Vault`,
      category: 'Resume Vault',
      badge: 'Saved',
      variant: 'success',
    });
  };

  const handleUpdateSavedResume = (resumeId, patch) => {
    setSavedResumes((prev) =>
      prev.map((item) => (item.id === resumeId ? { ...item, ...patch } : item))
    );
    if (authUser) {
      backendWorkspaceApi.updateResume(resumeId, patch).catch(() => {});
    }
  };

  const handleDeleteSavedResume = (resumeId) => {
    setSavedResumes((prev) => prev.filter((item) => item.id !== resumeId));
    if (authUser) {
      backendWorkspaceApi.deleteResume(resumeId).catch(() => {});
    }
  };

  const clearLocalReactWorkspace = (nextProfile = { ...EMPTY_PROFILE, onboardingDismissed: false }) => {
    setUserProfile(nextProfile);
    setRoadmapSkills([]);
    setLatestResumeAnalysis(null);
    setLatestJobMatch(null);
    setLatestInterviewSession(null);
    setInterviewHistory([]);
    setSavedResumes([]);
    setSharedResumeText('');
    setSharedMatcherText('');
    setSharedBuilderText('');
    setActivityLog([]);
  };

  const handleResetAll = async () => {
    if (authUser) {
      await backendWorkspaceApi.resetWorkspace();
      clearAllUserData();
      clearLocalReactWorkspace({
        ...EMPTY_PROFILE,
        name: authUser.fullName || authUser.name || '',
        email: authUser.email || '',
        onboardingDismissed: false,
      });
    } else {
      clearAllUserData();
      clearLocalReactWorkspace({ ...EMPTY_PROFILE, onboardingDismissed: false });
    }
    setActivePage('dashboard');
  };

  const handleStartNewGuestSession = () => {
    if (authUser) return;
    startNewGuestSession();
    clearLocalReactWorkspace({ ...EMPTY_PROFILE, onboardingDismissed: false });
    setActivePage('dashboard');
  };

  const handleLogout = async () => {
    await backendAuthApi.logout();
    setAuthUser(null);
    startNewGuestSession();
    clearLocalReactWorkspace({ ...EMPTY_PROFILE, onboardingDismissed: false });
    setActivePage('dashboard');
  };

  const handleAuthSuccess = async (authData) => {
    if (authData?.user) {
      setAuthUser(authData.user);
    }
    try {
      const dash = await backendWorkspaceApi.getDashboard();
      const isServerEmpty =
        (dash?.stats?.savedResumesCount || 0) === 0 &&
        (dash?.stats?.roadmapTotalSkills || 0) === 0;

      const hasLocalData =
        savedResumes.length > 0 ||
        roadmapSkills.length > 0 ||
        Boolean(userProfile.targetRole || userProfile.education);

      if (isServerEmpty && hasLocalData) {
        await backendWorkspaceApi.migrateLocalWorkspace({
          profile: userProfile,
          savedResumes,
          roadmapSkills,
        });
      }
    } catch {
      // non-fatal migration error
    }
    await hydrateFromBackend();
  };

  const showOnboarding = !userProfile.onboardingDismissed && !isProfileComplete(userProfile);

  const currentMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAuthenticated={Boolean(authUser)}
      />

      <div className="main-wrapper">
        <Topbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          userProfile={userProfile}
          authUser={authUser}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
          onStartNewGuestSession={handleStartNewGuestSession}
        />

        <main className="page-content">
          {activePage === 'dashboard' && (
            <Dashboard
              userProfile={userProfile}
              roadmapSkills={roadmapSkills}
              latestResumeAnalysis={latestResumeAnalysis}
              latestJobMatch={latestJobMatch}
              latestInterviewSession={latestInterviewSession}
              activityLog={activityLog}
              onNavigate={setActivePage}
            />
          )}
          {activePage === 'resume' && (
            <ResumeAnalyzer
              initialResumeText={sharedResumeText}
              onRecordAnalysis={handleRecordResumeAnalysis}
              onSaveResume={handleSaveResumeToVault}
              onSendToJobMatcher={(txt) => {
                setSharedMatcherText(txt);
                setActivePage('matcher');
              }}
              onOpenInBuilder={(txt) => {
                setSharedBuilderText(txt);
                setActivePage('builder');
              }}
            />
          )}
          {activePage === 'vault' && (
            <ResumeVault
              savedResumes={savedResumes}
              onUpdateResume={handleUpdateSavedResume}
              onDeleteResume={handleDeleteSavedResume}
              onReanalyze={(item) => {
                setSharedResumeText(item.text);
                setActivePage('resume');
              }}
              onSendToJobMatcher={(item) => {
                setSharedMatcherText(item.text);
                setActivePage('matcher');
              }}
              onOpenInBuilder={(item) => {
                setSharedBuilderText(item.text);
                setActivePage('builder');
              }}
            />
          )}
          {activePage === 'builder' && (
            <ResumeBuilder
              initialSourceText={sharedBuilderText}
              userProfile={userProfile}
              onSaveToVault={handleSaveResumeToVault}
              isAuthenticated={Boolean(authUser)}
            />
          )}
          {activePage === 'interview' && (
            <InterviewCoach
              onLogActivity={logActivity}
              onRecordSession={handleRecordInterviewSession}
              interviewHistory={interviewHistory}
              isAuthenticated={Boolean(authUser)}
            />
          )}
          {activePage === 'roadmap' && (
            <CareerRoadmap
              skills={roadmapSkills}
              userProfile={userProfile}
              onToggleSkill={handleToggleSkill}
              onSetSkillStatus={handleSetSkillStatus}
              onToggleKnownSkill={handleToggleKnownSkill}
              onAddSkill={handleAddSkill}
              onAddSkillsBatch={handleAddSkillsBatch}
              onDeleteSkill={handleDeleteSkill}
              onResetSkills={handleResetSkills}
              onNavigate={setActivePage}
            />
          )}
          {activePage === 'matcher' && (
            <JobMatcher
              initialResumeText={sharedMatcherText}
              userProfile={userProfile}
              roadmapSkills={roadmapSkills}
              onRecordMatch={handleRecordJobMatch}
            />
          )}
          {activePage === 'settings' && (
            <Settings
              key={JSON.stringify(userProfile)}
              userProfile={userProfile}
              onSaveProfile={handleSaveProfile}
              onResetAll={handleResetAll}
              isAuthenticated={Boolean(authUser)}
            />
          )}
        </main>

        <footer className="app-footer">
          <span>
            <strong>ELEVSKILL AI</strong> — Build Skills. Elevate Your Future.
          </span>
        </footer>
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {showOnboarding && activePage !== 'settings' && (
        <OnboardingModal
          userProfile={userProfile}
          isAuthenticated={Boolean(authUser)}
          onComplete={(updated) => handleSaveProfile(updated)}
          onSkip={async () => {
            const dismissedProfile = {
              ...userProfile,
              onboardingDismissed: true,
            };
            setUserProfile(dismissedProfile);
            if (authUser) {
              try {
                await backendWorkspaceApi.updateProfile(dismissedProfile);
              } catch {
                // Keep dismissed state locally if offline; backend sync will retry on next profile save
              }
            }
          }}
        />
      )}
    </div>
  );
}
