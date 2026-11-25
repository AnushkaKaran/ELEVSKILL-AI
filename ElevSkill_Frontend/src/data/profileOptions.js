export const TARGET_ROLE_OPTIONS = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Web Developer',
  'Python Developer',
  'Data Analyst',
  'Data Scientist',
  'AI/ML Engineer',
  'QA Engineer',
  'DevOps Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Other',
];

export const DEGREE_OPTIONS = [
  'B.Tech',
  'B.E.',
  'B.Sc.',
  'BCA',
  'MCA',
  'M.Tech',
  'M.Sc.',
  'MBA',
  'Diploma',
  'Other',
];

export const CAREER_INTEREST_OPTIONS = [
  'Software Development',
  'Web Development',
  'Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cybersecurity',
  'Cloud Computing & DevOps',
  'UI/UX Design',
  'Mobile App Development',
  'Other',
];

export function resolveDropdownState(savedValue, options) {
  const trimmed = (savedValue || '').trim();
  if (!trimmed) {
    return { selected: '', custom: '' };
  }
  const matched = options.find(
    (opt) => opt !== 'Other' && opt.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) {
    return { selected: matched, custom: '' };
  }
  return { selected: 'Other', custom: trimmed };
}

export function resolveDropdownValue(selected, custom) {
  if (selected === 'Other') {
    return (custom || '').trim();
  }
  return (selected || '').trim();
}
