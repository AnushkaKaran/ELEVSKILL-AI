import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import {
  GUEST_OWNER_ID,
  STORE_NAMES,
  clearOwnerWorkspace,
  deleteRecord,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  loadOwnerWorkspace,
  migrateGuestLocalStorageToIndexedDb,
  saveRecord,
  saveResumeRecord,
  updateRecord,
} from './utils/indexedDbStore';
import {
  getAuthSessionState,
  logoutFirebase,
  subscribeToAuthChanges,
} from './services/firebaseAuthService';
import { Dashboard } from './pages/Dashboard';

const ResumeAnalyzer = lazy(() =>
  import('./pages/ResumeAnalyzer').then((module) => ({
    default: module.ResumeAnalyzer,
  }))
);
const ResumeVault = lazy(() =>
  import('./pages/ResumeVault').then((module) => ({
    default: module.ResumeVault,
  }))
);
const ResumeBuilder = lazy(() =>
  import('./pages/ResumeBuilder').then((module) => ({
    default: module.ResumeBuilder,
  }))
);
const InterviewCoach = lazy(() =>
  import('./pages/InterviewCoach').then((module) => ({
    default: module.InterviewCoach,
  }))
);
const CareerRoadmap = lazy(() =>
  import('./pages/CareerRoadmap').then((module) => ({
    default: module.CareerRoadmap,
  }))
);
const JobMatcher = lazy(() =>
  import('./pages/JobMatcher').then((module) => ({
    default: module.JobMatcher,
  }))
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({
    default: module.Settings,
  }))
);

function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        fontWeight: 500,
      }}
    >
      Loading page...
    </div>
  );
}
import { EMPTY_PROFILE } from './data/sampleData';
import {
  clearAllUserData,
  startNewGuestSession,
  isProfileComplete,
  formatDateShort,
} from './utils/dashboardStore';

const THEME_PREF_KEY = 'elevskill_theme_preference';

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

  const [userProfile, setUserProfile] = useState(() => {
    let savedTheme = 'lavender';
    try {
      const pref = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_PREF_KEY) : null;
      if (pref && ['lavender', 'blossom', 'sky'].includes(pref)) savedTheme = pref;
    } catch {
      // ignore storage errors
    }
    return { ...EMPTY_PROFILE, themeVariant: savedTheme };
  });
  const [roadmapSkills, setRoadmapSkills] = useState([]);
  const [latestResumeAnalysis, setLatestResumeAnalysis] = useState(null);
  const [latestJobMatch, setLatestJobMatch] = useState(null);
  const [latestInterviewSession, setLatestInterviewSession] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [savedResumes, setSavedResumes] = useState([]);
  const [sharedResumeText, setSharedResumeText] = useState('');
  const [sharedMatcherText, setSharedMatcherText] = useState('');
  const [sharedBuilderText, setSharedBuilderText] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [storageError, setStorageError] = useState('');

  const handleStorageError = useCallback((err) => {
    setStorageError(
      err?.message || 'Unable to save workspace changes to browser storage (IndexedDB).'
    );
  }, []);

  const authSession = getAuthSessionState(authUser);
  const activeOwnerId = authSession.ownerId;

  const hydrateWorkspace = useCallback(async (ownerId, currentAuthUser = null) => {
    setStorageError('');
    setSharedResumeText('');
    setSharedMatcherText('');
    setSharedBuilderText('');
    try {
      if (ownerId === GUEST_OWNER_ID) {
        await migrateGuestLocalStorageToIndexedDb({ ownerId: GUEST_OWNER_ID }).catch(() => null);
      }

      const ws = await loadOwnerWorkspace(ownerId);
      const baseProfile = ws.profile
        ? { ...EMPTY_PROFILE, ...ws.profile }
        : {
            ...EMPTY_PROFILE,
            name: currentAuthUser?.fullName || currentAuthUser?.name || '',
            email: currentAuthUser?.email || '',
          };

      setUserProfile(baseProfile);
      setRoadmapSkills(ws.roadmapSkills || []);
      setSavedResumes(ws.savedResumes || []);
      setLatestResumeAnalysis(ws.latestResumeAnalysis || null);
      setLatestJobMatch(ws.latestJobMatch || null);
      setInterviewHistory(
        (ws.interviewHistory || []).map((item) => ({
          ...item,
          timeLabel: item.timeLabel || formatDateShort(item.practicedAt || item.createdAt),
        }))
      );
      setLatestInterviewSession(ws.latestInterviewSession || null);
      setActivityLog(
        (ws.activityLog || []).slice(0, 15).map((item) => ({
          ...item,
          timeLabel: item.timeLabel || formatDateShort(item.createdAt),
        }))
      );
    } catch (err) {
      setStorageError(
        err?.message || 'Browser storage (IndexedDB) is unavailable; changes are kept in memory only.'
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setAuthUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    hydrateWorkspace(activeOwnerId, authUser);
  }, [activeOwnerId, authUser, hydrateWorkspace]);

  useEffect(() => {
    const theme = userProfile.themeVariant || 'lavender';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_PREF_KEY, theme);
      }
    } catch {
      // ignore storage errors
    }
  }, [userProfile.themeVariant]);

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
    saveRecord(STORE_NAMES.ACTIVITY_LOGS, entry, activeOwnerId).catch(handleStorageError);
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
    updateRecord(
      STORE_NAMES.ROADMAP_SKILLS,
      skillId,
      { status: nextStatus, completed: nextCompleted },
      activeOwnerId
    ).catch(handleStorageError);

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
    updateRecord(
      STORE_NAMES.ROADMAP_SKILLS,
      skillId,
      { status: validStatus, completed: nextCompleted },
      activeOwnerId
    ).catch(handleStorageError);

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
    updateRecord(
      STORE_NAMES.ROADMAP_SKILLS,
      skillId,
      { alreadyKnown: nextKnown },
      activeOwnerId
    ).catch(handleStorageError);
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
    saveRecord(STORE_NAMES.ROADMAP_SKILLS, newSkill, activeOwnerId).catch(handleStorageError);
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
    Promise.all(toAdd.map((skill) => saveRecord(STORE_NAMES.ROADMAP_SKILLS, skill, activeOwnerId))).catch(
      () => {}
    );
    logActivity({
      title: `Synced ${toAdd.length} recommended skill(s) to Career Roadmap`,
      category: 'Career Roadmap',
      badge: `+${toAdd.length} Skills`,
      variant: 'blue',
    });
    return toAdd.length;
  };

  const handleResetSkills = () => {
    const ids = roadmapSkills.map((s) => s.id);
    setRoadmapSkills([]);
    Promise.all(ids.map((id) => deleteRecord(STORE_NAMES.ROADMAP_SKILLS, id, activeOwnerId))).catch(
      () => {}
    );
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
    deleteRecord(STORE_NAMES.ROADMAP_SKILLS, skillId, activeOwnerId).catch(handleStorageError);
    logActivity({
      title: `Removed roadmap skill "${targetSkill.title}"`,
      category: 'Career Roadmap',
      badge: 'Removed',
      variant: 'neutral',
    });
  };

  const handleRecordResumeAnalysis = (analysisSummary) => {
    const entry = {
      ...analysisSummary,
      overallScore: analysisSummary.score ?? analysisSummary.overallScore ?? 0,
    };
    setLatestResumeAnalysis(entry);
    saveRecord(STORE_NAMES.RESUME_ANALYSES, entry, activeOwnerId).catch(handleStorageError);
    logActivity({
      title: `Completed resume analysis (${analysisSummary.score}/100 · ${analysisSummary.status})`,
      category: 'Resume Analyzer',
      badge: `${analysisSummary.score}%`,
      variant: analysisSummary.score >= 75 ? 'success' : 'blue',
    });
  };

  const handleRecordJobMatch = (matchSummary) => {
    const entry = {
      ...matchSummary,
      overallScore: matchSummary.matchPercent ?? matchSummary.overallScore ?? 0,
    };
    setLatestJobMatch(entry);
    saveRecord(STORE_NAMES.JOB_MATCH_HISTORY, entry, activeOwnerId).catch(handleStorageError);
    logActivity({
      title: `Completed job matching (${matchSummary.matchPercent}% keyword overlap)`,
      category: 'Job Matcher',
      badge: `${matchSummary.matchPercent}% Match`,
      variant: matchSummary.matchPercent >= 65 ? 'success' : 'blue',
    });
  };

  const handleSaveProfile = (updatedProfile) => {
    setUserProfile(updatedProfile);
    saveRecord(STORE_NAMES.PROFILES, updatedProfile, activeOwnerId).catch(handleStorageError);
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
    const roundedScore = Math.round(score);
    const entry = {
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      score: roundedScore,
      category,
      questionText,
      practicedAt: now,
      timeLabel: formatDateShort(now),
    };
    setLatestInterviewSession((prev) => ({
      score: roundedScore,
      category,
      practicedAt: now,
      totalPracticed: (prev?.totalPracticed || 0) + 1,
    }));
    setInterviewHistory((prev) => [entry, ...prev].slice(0, 30));
    saveRecord(STORE_NAMES.INTERVIEW_HISTORY, entry, activeOwnerId).catch(handleStorageError);
  };

  const handleSaveResumeToVault = ({
    name,
    text,
    lastScore = null,
    classification = '',
    originalFileName = null,
    originalFileDataUrl = null,
    pdfBlob = null,
  }) => {
    const now = new Date().toISOString();
    const entry = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      text,
      extractedText: text,
      lastScore,
      classification,
      originalFileName,
      originalFileDataUrl,
      pdfBlob,
      hasPdfBlob: Boolean(pdfBlob),
      savedAt: now,
      updatedAt: now,
    };
    setSavedResumes((prev) => [entry, ...prev]);
    saveResumeRecord(entry, activeOwnerId).catch(handleStorageError);
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
    updateRecord(
      STORE_NAMES.RESUMES,
      resumeId,
      {
        ...patch,
        ...(patch.text !== undefined ? { extractedText: patch.text } : {}),
      },
      activeOwnerId
    ).catch(handleStorageError);
  };

  const handleDeleteSavedResume = (resumeId) => {
    setSavedResumes((prev) => prev.filter((item) => item.id !== resumeId));
    deleteRecord(STORE_NAMES.RESUMES, resumeId, activeOwnerId).catch(handleStorageError);
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
    await clearOwnerWorkspace(activeOwnerId);
    if (activeOwnerId === GUEST_OWNER_ID) {
      clearAllUserData();
    }
    if (authUser) {
      clearLocalReactWorkspace({
        ...EMPTY_PROFILE,
        name: authUser.fullName || authUser.name || '',
        email: authUser.email || '',
        onboardingDismissed: false,
      });
    } else {
      clearLocalReactWorkspace({ ...EMPTY_PROFILE, onboardingDismissed: false });
    }
    setActivePage('dashboard');
  };

  const handleStartNewGuestSession = async () => {
    if (authUser) return;
    await clearOwnerWorkspace(GUEST_OWNER_ID);
    startNewGuestSession();
    clearLocalReactWorkspace({ ...EMPTY_PROFILE, onboardingDismissed: false });
    setActivePage('dashboard');
  };

  const handleLogout = async () => {
    await logoutFirebase();
    setAuthUser(null);
    setSharedResumeText('');
    setSharedMatcherText('');
    setSharedBuilderText('');
    setStorageError('');
    startNewGuestSession();
    setActivePage('dashboard');
  };

  const handleAuthSuccess = async (authData) => {
    if (authData?.user) {
      setSharedResumeText('');
      setSharedMatcherText('');
      setSharedBuilderText('');
      setStorageError('');
      setAuthUser(authData.user);
    }
  };

  const handleExportBackup = () => exportWorkspaceBackup(activeOwnerId);

  const handleImportBackup = async (backupPayload) => {
    await importWorkspaceBackup(backupPayload, activeOwnerId, { replaceExisting: true });
    await hydrateWorkspace(activeOwnerId, authUser);
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
        isAuthenticated={authSession.isAuthenticated}
      />

      <div className="main-wrapper">
        <Topbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          userProfile={userProfile}
          authUser={authUser}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenSettings={() => setActivePage('settings')}
          onLogout={handleLogout}
          onStartNewGuestSession={handleStartNewGuestSession}
        />

        <main className="page-content">
          {storageError && (
            <div
              className="validation-error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <span>{storageError}</span>
              <button
                type="button"
                onClick={() => setStorageError('')}
                style={{ fontWeight: 600, textDecoration: 'underline', flexShrink: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}
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
          <Suspense fallback={<PageLoadingFallback />}>
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
              ownerId={activeOwnerId}
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
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              isAuthenticated={authSession.isAuthenticated}
            />
          )}
          </Suspense>
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
          isAuthenticated={authSession.isAuthenticated}
          onComplete={(updated) => handleSaveProfile(updated)}
          onSkip={async () => {
            const dismissedProfile = {
              ...userProfile,
              onboardingDismissed: true,
            };
            setUserProfile(dismissedProfile);
            saveRecord(STORE_NAMES.PROFILES, dismissedProfile, activeOwnerId).catch(handleStorageError);
          }}
        />
      )}
    </div>
  );
}
