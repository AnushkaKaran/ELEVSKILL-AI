import {
  FileCheck,
  Target,
  Sparkles,
  ArrowRight,
  FileText,
  MessageSquare,
  Map,
  GitCompare,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Card, StatCard } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { HybridAiTipCard } from '../components/HybridAiTipCard';
import {
  isProfileComplete,
  calculateRoadmapProgress,
  formatDateShort,
} from '../utils/dashboardStore';
import './pages.css';

export function Dashboard({
  userProfile,
  roadmapSkills,
  latestResumeAnalysis,
  latestJobMatch,
  latestInterviewSession,
  activityLog,
  onNavigate,
}) {
  const profileComplete = isProfileComplete(userProfile);
  const roadmapStats = calculateRoadmapProgress(roadmapSkills);

  const firstName = userProfile.name?.trim() ? userProfile.name.trim().split(/\s+/)[0] : '';
  const featureLinks = [
    {
      id: 'resume',
      title: 'Resume Analyzer',
      desc: latestResumeAnalysis
        ? `Latest: ${latestResumeAnalysis.score}/100 (${latestResumeAnalysis.status})`
        : 'No analysis yet',
      icon: FileText,
    },
    {
      id: 'interview',
      title: 'Interview Coach',
      desc: latestInterviewSession
        ? `Latest: ${latestInterviewSession.score}/100 · ${latestInterviewSession.totalPracticed} session(s)`
        : 'Practice behavioral & technical prompts',
      icon: MessageSquare,
    },
    {
      id: 'roadmap',
      title: 'Career Roadmap',
      desc:
        roadmapStats.totalCount > 0
          ? `${roadmapStats.completedCount}/${roadmapStats.totalCount} skills completed`
          : 'No roadmap skills yet',
      icon: Map,
    },
    {
      id: 'matcher',
      title: 'Job Matcher',
      desc: latestJobMatch
        ? `Latest overlap: ${latestJobMatch.matchPercent}%`
        : 'Compare resume vs job description',
      icon: GitCompare,
    },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <section className="welcome-banner">
        <div>
          <h2 className="welcome-title">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome to ELEVSKILL AI'}
          </h2>
          {profileComplete ? (
            <p className="welcome-desc">
              Preparing for <strong>{userProfile.targetRole}</strong> ({userProfile.experienceLevel})
              {userProfile.education ? ` · ${userProfile.education}` : ''}.
            </p>
          ) : (
            <p className="welcome-desc">
              Complete your profile to personalize your dashboard with your education and target role.
            </p>
          )}
        </div>
        <div className="welcome-actions">
          {!profileComplete && (
            <Button variant="primary" onClick={() => onNavigate('settings')}>
              Complete Profile <ArrowRight size={16} />
            </Button>
          )}
          <Button
            variant={profileComplete ? 'primary' : 'secondary'}
            onClick={() => onNavigate('resume')}
          >
            Analyze Resume
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('interview')}>
            Practice Interview
          </Button>
        </div>
      </section>

      <div className="grid-4">
        <StatCard
          label="Roadmap Progress"
          value={`${roadmapStats.overallPercent}%`}
          hint={`${roadmapStats.completedCount} of ${roadmapStats.totalCount} skills completed`}
          icon={Target}
          tone="purple"
        />
        <StatCard
          label="Resume Analysis"
          value={latestResumeAnalysis ? `${latestResumeAnalysis.score}/100` : 'No analysis yet'}
          hint={
            latestResumeAnalysis
              ? `${latestResumeAnalysis.status} · ${formatDateShort(latestResumeAnalysis.analyzedAt)}`
              : 'No resume analysis yet'
          }
          icon={Sparkles}
          tone="blue"
        />
        <StatCard
          label="Recent Activity"
          value={activityLog.length}
          hint={
            activityLog.length > 0
              ? `Latest: ${activityLog[0].category}`
              : 'No recent activity'
          }
          icon={FileCheck}
          tone="amber"
        />
      </div>

      <div className="grid-2">
        <Card
          title="Career Preparation Progress"
          subtitle={
            userProfile.targetRole
              ? `Roadmap progress for ${userProfile.targetRole}`
              : 'Calculated dynamically from your Career Roadmap skills'
          }
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('roadmap')}>
              Open Roadmap
            </Button>
          }
        >
          {roadmapStats.totalCount === 0 ? (
            <div className="empty-state">
              No roadmap skills added yet. Open <strong>Career Roadmap</strong> to add skills or sync
              recommendations for {userProfile.targetRole || 'your target role'}.
            </div>
          ) : (
            <div className="progress-stack">
              <ProgressBar
                label={`Overall Readiness (${roadmapStats.completedCount}/${roadmapStats.totalCount})`}
                value={roadmapStats.overallPercent}
                tone="purple"
              />
              {roadmapStats.categories.slice(0, 4).map((cat, idx) => (
                <ProgressBar
                  key={cat.category}
                  label={`${cat.category} (${cat.completed}/${cat.total})`}
                  value={cat.percent}
                  tone={idx % 2 === 0 ? 'blue' : 'green'}
                />
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Quick Navigation"
          subtitle="Jump directly to any ELEVSKILL AI tool"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
              <SettingsIcon size={14} /> Settings
            </Button>
          }
        >
          <div className="quick-nav-grid">
            {featureLinks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="quick-nav-tile"
                  onClick={() => onNavigate(item.id)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.title}</div>
                    <div className="text-small text-muted">{item.desc}</div>
                  </div>
                  <Icon size={18} style={{ color: 'var(--accent-purple-deep)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <HybridAiTipCard />

      <Card
        title="Recent Activity"
        subtitle="Recorded from your completed actions across ELEVSKILL AI"
      >
        {activityLog.length === 0 ? (
          <div className="empty-state">No recent activity</div>
        ) : (
          <div className="activity-list">
            {activityLog.slice(0, 5).map((item) => (
              <div key={item.id} className="activity-item">
                <div>
                  <div className="activity-title">{item.title}</div>
                  <div className="activity-meta">
                    {item.category} · {item.timeLabel}
                  </div>
                </div>
                <Badge variant={item.variant || 'neutral'}>{item.badge}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
