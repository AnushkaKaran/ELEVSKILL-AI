export const EMPTY_PROFILE = {
  name: '',
  email: '',
  education: '',
  degree: '',
  institution: '',
  graduationYear: '',
  targetRole: '',
  experienceLevel: '',
  skills: '',
  careerInterests: '',
  emailNotifications: false,
  onboardingDismissed: false,
  themeVariant: 'lavender',
};

export const DEFAULT_ROADMAP_SKILLS = [
  {
    id: 'sk-1',
    title: 'Semantic HTML5 & Accessible Forms',
    category: 'Core Web',
    priority: 'High',
    hours: 4,
    completed: false,
  },
  {
    id: 'sk-2',
    title: 'Modern CSS (Flexbox, Grid, Responsive Breakpoints)',
    category: 'Core Web',
    priority: 'High',
    hours: 6,
    completed: false,
  },
  {
    id: 'sk-3',
    title: 'JavaScript ES6+, Async/Await & Fetch API',
    category: 'JavaScript',
    priority: 'High',
    hours: 8,
    completed: false,
  },
  {
    id: 'sk-4',
    title: 'React Components, Hooks & State Management',
    category: 'Frameworks',
    priority: 'High',
    hours: 10,
    completed: false,
  },
  {
    id: 'sk-5',
    title: 'Git Branching, Pull Requests & Clean Commits',
    category: 'Workflow',
    priority: 'Medium',
    hours: 3,
    completed: false,
  },
  {
    id: 'sk-6',
    title: 'REST APIs, Error States & Loading Skeletons',
    category: 'Integration',
    priority: 'High',
    hours: 5,
    completed: false,
  },
  {
    id: 'sk-7',
    title: 'Unit & Component Testing Basics (Vitest / RTL)',
    category: 'Quality',
    priority: 'Medium',
    hours: 6,
    completed: false,
  },
  {
    id: 'sk-8',
    title: 'Behavioral Interview Stories (STAR Method)',
    category: 'Career Prep',
    priority: 'High',
    hours: 4,
    completed: false,
  },
];

export const LEARNING_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    title: 'Build 2 End-to-End Portfolio Projects with Real States',
    description:
      'Focus on loading, empty, and error states alongside responsive mobile layouts rather than adding more toy todo apps.',
    tag: 'Portfolio',
    duration: '1–2 weeks',
  },
  {
    id: 'rec-2',
    title: 'Practice 5 STAR Stories for Campus & Internship Experience',
    description:
      'Prepare concise 90-second stories covering teamwork, conflict resolution, tight deadlines, and debugging.',
    tag: 'Interviews',
    duration: '3 hours',
  },
  {
    id: 'rec-3',
    title: 'Write Quantified Resume Bullet Points',
    description:
      'Pair action verbs (Built, Reduced, Automated) with measurable outcomes like page load time, test coverage, or users served.',
    tag: 'Resume',
    duration: '2 hours',
  },
];

export const INTERVIEW_CATEGORIES = [
  { id: 'behavioral', label: 'Behavioral (STAR)' },
  { id: 'frontend', label: 'Frontend & React' },
  { id: 'dsa', label: 'Problem Solving & Logic' },
  { id: 'general', label: 'Graduate & Culture Fit' },
];

export const INTERVIEW_QUESTIONS = {
  behavioral: [
    {
      id: 'beh-1',
      question:
        'Tell me about a time you faced a difficult bug or technical blocker in a class or personal project. How did you resolve it?',
      tips: 'Use STAR: briefly set the Situation, state your Task, detail the debugging Actions you took, and share the Result.',
      keywords: ['situation', 'debug', 'tested', 'root cause', 'fixed', 'learned', 'result'],
    },
    {
      id: 'beh-2',
      question:
        'Describe a group project where teammates had different opinions on how to build something. How did you handle it?',
      tips: 'Highlight active listening, objective tradeoffs, and how the team aligned on a solution.',
      keywords: ['team', 'listened', 'compromise', 'agreed', 'outcome', 'communication'],
    },
  ],
  frontend: [
    {
      id: 'fe-1',
      question:
        'What is the difference between state and props in React, and when would you lift state up to a parent component?',
      tips: 'Explain ownership/mutability (props are passed down, state is managed internally) and give a concrete shared-state example.',
      keywords: ['props', 'state', 'immutable', 'parent', 'child', 're-render', 'share'],
    },
    {
      id: 'fe-2',
      question:
        'How do you make a web dashboard responsive and accessible across both desktop and mobile screens?',
      tips: 'Mention semantic HTML, keyboard navigation, contrast, flexible CSS Grid/Flexbox, and media queries.',
      keywords: ['semantic', 'aria', 'keyboard', 'grid', 'flexbox', 'media query', 'mobile'],
    },
  ],
  dsa: [
    {
      id: 'dsa-1',
      question:
        'How would you explain time and space complexity (Big O) to another student, and why does it matter in real apps?',
      tips: 'Keep it practical: compare O(1) hash map lookups vs O(n) array scans on growing datasets.',
      keywords: ['big o', 'time', 'space', 'hash', 'loop', 'scale', 'complexity'],
    },
    {
      id: 'dsa-2',
      question:
        'If a search input filters a list of 5,000 items on every keystroke and feels sluggish, how would you optimize it?',
      tips: 'Discuss debouncing, memoization, indexing, or virtualizing the rendered list.',
      keywords: ['debounce', 'memo', 'performance', 'render', 'virtual', 'filter'],
    },
  ],
  general: [
    {
      id: 'gen-1',
      question:
        'Why are you interested in this entry-level role, and what kind of team environment helps you learn fastest?',
      tips: 'Connect your coursework/projects to the role and show curiosity, ownership, and openness to feedback.',
      keywords: ['learn', 'feedback', 'project', 'team', 'growth', 'impact'],
    },
    {
      id: 'gen-2',
      question:
        'What is a recent technology or concept you taught yourself outside of class, and how did you apply it?',
      tips: 'Show self-direction: explain why you picked it, what you built, and what surprised you.',
      keywords: ['built', 'documentation', 'practice', 'challenge', 'applied'],
    },
  ],
};

/* Optional text snippets only used when a user explicitly clicks "Load Sample" */
export const SAMPLE_RESUME_TEXT = `Computer Science Senior | Graduating May 2026
Skills: JavaScript, React, HTML5, CSS3, Git, REST APIs, Node.js, SQL

Experience:
Frontend Intern — Campus Tech Lab
- Built reusable React components for a student course planner used by 400+ students.
- Improved mobile layout responsiveness using CSS Grid and Flexbox.
- Collaborated with 3 teammates using Git pull requests and weekly code reviews.

Projects:
- StudyTrack Web App: Designed and implemented a task tracker with local storage persistence and responsive UI.`;

export const SAMPLE_JOB_DESCRIPTION = `Junior Frontend Developer (New Grad)
We are looking for a motivated Computer Science graduate or senior to join our product engineering team.

Requirements:
- Solid foundation in JavaScript (ES6+), HTML5, CSS3, and React.
- Experience building responsive web interfaces and integrating REST APIs.
- Familiarity with Git, pull requests, and collaborative code reviews.
- Bonus: Experience with TypeScript, unit testing (Vitest or Jest), and web accessibility (WCAG).`;
