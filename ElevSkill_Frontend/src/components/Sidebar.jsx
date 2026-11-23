import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  FileEdit,
  MessageSquare,
  Map,
  GitCompare,
  Settings,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { id: 'resume', label: 'Resume Analyzer', icon: FileText, section: 'Resume Suite' },
  { id: 'vault', label: 'Resume Vault', icon: FolderOpen, section: 'Resume Suite' },
  { id: 'builder', label: 'Resume Builder', icon: FileEdit, section: 'Resume Suite' },
  { id: 'interview', label: 'Interview Coach', icon: MessageSquare, section: 'Career Preparation' },
  { id: 'roadmap', label: 'Career Roadmap', icon: Map, section: 'Career Preparation' },
  { id: 'matcher', label: 'Job Matcher', icon: GitCompare, section: 'Career Preparation' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'Account' },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose, isAuthenticated = false }) {
  const sections = ['Overview', 'Resume Suite', 'Career Preparation', 'Account'];

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <BrandLogo variant="full-tagline" size="sm" />
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => {
            const items = NAV_ITEMS.filter((item) => item.section === section);
            return (
              <div key={section}>
                <div className="nav-section-label">{section}</div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={18} className="nav-icon" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {isAuthenticated && (
          <div className="sidebar-footer">
            <div className="sidebar-demo-note">
              <strong>Synced Account</strong>
              Data synchronized with your ELEVSKILL account.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
