import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Printer: () => null,
  RotateCcw: () => null,
  Save: () => null,
  Sparkles: () => null,
}));

import {
  CAREER_INTEREST_OPTIONS,
  DEGREE_OPTIONS,
  TARGET_ROLE_OPTIONS,
  resolveDropdownState,
  resolveDropdownValue,
} from '../src/data/profileOptions';
import { validateRequiredResumeFields } from '../src/pages/ResumeBuilder';

describe('Profile Setup dropdown options & custom Other preservation', () => {
  it('resolves known options directly without switching to Other', () => {
    expect(resolveDropdownState('Backend Developer', TARGET_ROLE_OPTIONS)).toEqual({
      selected: 'Backend Developer',
      custom: '',
    });
    expect(resolveDropdownState('B.Tech', DEGREE_OPTIONS)).toEqual({
      selected: 'B.Tech',
      custom: '',
    });
    expect(resolveDropdownState('Data Science', CAREER_INTEREST_OPTIONS)).toEqual({
      selected: 'Data Science',
      custom: '',
    });
  });

  it('preserves previously saved custom values under Other for editing', () => {
    expect(resolveDropdownState('B.S. Computer Science', DEGREE_OPTIONS)).toEqual({
      selected: 'Other',
      custom: 'B.S. Computer Science',
    });
    expect(resolveDropdownState('Site Reliability Engineer', TARGET_ROLE_OPTIONS)).toEqual({
      selected: 'Other',
      custom: 'Site Reliability Engineer',
    });
    expect(resolveDropdownValue('Other', '  Distributed Systems  ')).toBe('Distributed Systems');
    expect(resolveDropdownValue('Python Developer', 'ignored')).toBe('Python Developer');
  });
});

describe('Resume Builder mandatory field validation & fresher support', () => {
  it('blocks generation/download when any of the 8 required fields are missing', () => {
    const res = validateRequiredResumeFields({
      fullName: 'Ritu Sharma',
      email: 'ritu@example.com',
      phone: '',
      summary: 'CS graduate',
      education: 'B.Tech CS',
      skills: 'Python, SQL',
      softSkills: '',
      projects: 'Portfolio app',
    });
    expect(res.valid).toBe(false);
    expect(res.missingFields).toEqual(['Phone', 'Soft Skills']);
    expect(res.message).toContain('Phone');
    expect(res.message).toContain('Soft Skills');
  });

  it('allows freshers/students without work experience, internships, certifications, or links', () => {
    const res = validateRequiredResumeFields({
      fullName: 'Siddharth Rao',
      email: 'siddharth@example.com',
      phone: '+91 98000 88990',
      summary: 'Final-year CS student building React and Python projects.',
      education: 'B.Tech Computer Science (2026)',
      skills: 'Python, React, SQL, Git',
      softSkills: 'Team Collaboration, Problem Solving, Communication',
      projects: 'Campus Event Portal built with React and FastAPI.',
      experience: '',
      internships: '',
      certifications: '',
      links: '',
    });
    expect(res.valid).toBe(true);
    expect(res.missingFields).toEqual([]);
  });
});
