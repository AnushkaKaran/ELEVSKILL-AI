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

export const SAMPLE_RESUMES = [
  {
    id: 'frontend-dev',
    label: 'Frontend Developer (React & TypeScript)',
    category: 'Frontend Developer',
    quality: 'Strong',
    resumeText: `Aarav Mehta
Bengaluru, India | +91 98000 11223 | aarav.mehta@example.com | github.com/aaravmehta

Summary
Frontend Developer with 1+ year of experience building responsive React and TypeScript web applications.

Technical Skills
JavaScript, TypeScript, React, HTML5, CSS3, REST APIs, Vite, Vitest, Git, WCAG Accessibility

Experience
Frontend Engineering Intern — Campus Tech Lab (May 2025 – Nov 2025)
- Built 14 reusable React components for a student course planner used by 450+ active students.
- Reduced mobile layout shift by 35% using CSS Grid, Flexbox, and semantic HTML5.
- Integrated REST APIs and added 28 Vitest unit tests during collaborative Git code reviews.

Projects
- StudyTrack Web App: Designed a task tracker with IndexedDB persistence and keyboard-accessible navigation.

Education
B.Tech in Computer Science, Example Institute of Technology (2026)`,
    jobDescription: `Junior Frontend Developer
We are seeking a Frontend Developer to build accessible, high-performance web interfaces.

Required:
- JavaScript, TypeScript, React, HTML5, CSS3
- REST API integration, Git, and collaborative code reviews

Preferred:
- Vitest or Jest unit testing, Vite, WCAG accessibility`,
  },
  {
    id: 'data-analyst',
    label: 'Data Analyst (SQL, Python & Power BI)',
    category: 'Data Analyst',
    quality: 'Strong',
    resumeText: `Priya Nair
Kochi, India | +91 98000 22334 | priya.nair@example.com | linkedin.com/in/priyanair-demo

Summary
Detail-oriented Data Analyst skilled in SQL querying, Python data cleaning, and interactive Power BI dashboards.

Technical Skills
SQL, PostgreSQL, Python, Pandas, NumPy, Exploratory Data Analysis, Data Visualization, Power BI, Tableau, Git

Experience
Data Analyst Intern — FinMetrics Analytics (Jan 2025 – Jun 2025)
- Queried 1.2M+ customer transaction rows in PostgreSQL to identify churn cohorts.
- Automated weekly KPI reporting with Python and Pandas, saving 6 hours of manual work per week.
- Built 4 executive Power BI dashboards tracking retention, funnel conversion, and revenue variance.

Projects
- Retail Sales EDA: Performed exploratory data analysis and Matplotlib cohort visualizations on 85,000 orders.

Education
B.Sc. in Statistics & Data Analytics, Example University (2025)`,
    jobDescription: `Data Analyst
Join our analytics team to transform product and revenue data into actionable business insights.

Required:
- SQL, Python, Pandas, Exploratory Data Analysis, Data Visualization
- Power BI or Tableau dashboarding

Preferred:
- PostgreSQL, Statistics, Git`,
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist (Heartiva ML & Preprocessing)',
    category: 'Data Scientist',
    quality: 'Strong',
    resumeText: `Rohan Kulkarni
Pune, India | +91 98000 33445 | rohan.kulkarni@example.com | github.com/rohankulkarni

Summary
Aspiring Data Scientist with hands-on experience in statistical modeling, dataset preprocessing, and scikit-learn pipelines.

Technical Skills
Python, SQL, Pandas, NumPy, scikit-learn, Statistics, Exploratory Data Analysis, Data Visualization, Git

Internship Experience
Data Science Intern — InsightPulse Labs (Jun 2024 – Dec 2024)
- Built churn classification models in scikit-learn achieving 86% F1-score across 50,000 user records.
- Automated SQL feature extraction pipelines and documented model evaluation metrics.

Projects
- Heartiva Cardiac Risk Predictor: Cleaned and preprocessed a 70,000-row clinical dataset, handled missing values, engineered domain features, and trained logistic regression and random forest classifiers.

Education
B.Tech in Artificial Intelligence & Data Science, Example University (2025)`,
    jobDescription: `Junior Data Scientist
Work with product and engineering teams to build predictive models and run experimentation.

Required:
- Python, SQL, Machine Learning, Pandas, NumPy, scikit-learn
- Data Preprocessing, Exploratory Data Analysis, Statistics

Preferred:
- Data Visualization, PyTorch, AWS`,
  },
  {
    id: 'ai-ml-engineer',
    label: 'AI/ML Engineer (PyTorch, NLP & FastAPI)',
    category: 'AI/ML Engineer',
    quality: 'Strong',
    resumeText: `Ananya Iyer
Hyderabad, India | +91 98000 44556 | ananya.iyer@example.com | github.com/ananyaiyer

Summary
AI/ML Engineer with 2 years of experience deploying NLP embeddings and FastAPI inference microservices.

Technical Skills
Python, PyTorch, TensorFlow, Machine Learning, Deep Learning, NLP, LLMs, FastAPI, Docker, SQL, Git

Experience
Machine Learning Engineer — NovaMind Systems (Jul 2024 – Present)
- Deployed semantic search microservices using PyTorch and FastAPI serving 12,000+ daily queries at 95ms p95 latency.
- Reduced container memory footprint by 28% using CPU-only PyTorch builds and quantized inference pipelines.
- Built automated Pytest regression suites for NLP extraction and ranking endpoints.

Projects
- DocuMatch Semantic Screener: Fine-tuned sentence embeddings and built a Dockerized FastAPI matching service.

Education
M.Tech in Computer Science (ML), Example Institute (2024)`,
    jobDescription: `AI/ML Engineer
Build, evaluate, and deploy production NLP and machine learning microservices.

Required:
- Python, Machine Learning, PyTorch or TensorFlow, NLP, FastAPI, Docker, Git

Preferred:
- Deep Learning, LLMs, SQL, Pytest`,
  },
  {
    id: 'backend-dev',
    label: 'Backend Developer (Python, FastAPI & Docker)',
    category: 'Backend Developer',
    quality: 'Strong',
    resumeText: `Vikram Desai
Ahmedabad, India | +91 98000 55667 | vikram.desai@example.com | github.com/vikramdesai

Summary
Backend Developer with 2 years of experience designing REST APIs, relational schemas, and containerized services.

Technical Skills
Python, FastAPI, SQL, PostgreSQL, REST APIs, Docker, Pytest, Linux, Git, CI/CD

Experience
Backend Software Engineer — CloudCart Technologies (Aug 2024 – Present)
- Designed 18 FastAPI endpoints backed by PostgreSQL, handling 400+ requests/minute with 99.9% uptime.
- Optimized slow SQL joins with composite indexes, cutting checkout API p95 latency from 920ms to 140ms.
- Containerized services with Docker and added GitHub Actions CI/CD pipelines with 92% Pytest coverage.

Projects
- RateGuard API Gateway: Implemented token-bucket rate limiting and structured health-check telemetry.

Education
B.E. in Information Technology, Example Engineering College (2024)`,
    jobDescription: `Backend Developer
Build scalable APIs and reliable data-backed backend services.

Required:
- Python, FastAPI, SQL, PostgreSQL, REST APIs, Docker, Git

Preferred:
- Pytest, CI/CD, Linux, AWS`,
  },
  {
    id: 'fullstack-dev',
    label: 'Full Stack Developer (MERN & PostgreSQL)',
    category: 'Full Stack Developer',
    quality: 'Strong',
    resumeText: `Neha Verma
Noida, India | +91 98000 66778 | neha.verma@example.com | github.com/nehaverma

Summary
Full Stack Developer experienced in React, Node.js, Express, MongoDB, and PostgreSQL production web apps.

Technical Skills
JavaScript, TypeScript, React, Node.js, Express, MongoDB, PostgreSQL, REST APIs, HTML5, CSS3, Docker, Git

Experience
Full Stack Developer — StackBridge Digital (Jun 2024 – Present)
- Delivered an end-to-end hiring portal with React, TypeScript, Node.js, and PostgreSQL serving 2,000+ monthly users.
- Implemented JWT authentication, role-based access control, and REST API validation middleware.
- Reduced frontend bundle size by 42% using route-level code splitting and lazy loading.

Projects
- CollabBoard: Built a real-time kanban workspace with Express, MongoDB, and Docker Compose.

Education
B.Tech in Computer Science, Example University (2024)`,
    jobDescription: `Full Stack Developer
Own end-to-end feature delivery across our React frontend and Node.js backend services.

Required:
- JavaScript, React, Node.js, Express, REST APIs, SQL or MongoDB, Git

Preferred:
- TypeScript, Docker, PostgreSQL, Jest`,
  },
  {
    id: 'python-dev',
    label: 'Python Developer (APIs & Automation)',
    category: 'Python Developer',
    quality: 'Good',
    resumeText: `Karan Malhotra
Chandigarh, India | +91 98000 77889 | karan.malhotra@example.com | github.com/karanmalhotra

Summary
Python Developer focused on backend API development, automated testing, and data processing scripts.

Technical Skills
Python, FastAPI, SQL, SQLite, Pytest, REST APIs, Linux, Git

Experience
Junior Python Developer — AutomateFlow (Sep 2024 – Present)
- Built Python ETL scripts and FastAPI ingestion services processing 50,000+ daily JSON records.
- Wrote 45+ Pytest integration tests and reduced production regression defects by 30%.

Projects
- InvoiceParse CLI: Extracted structured fields from PDF invoices into SQLite with automated validation.

Education
B.C.A., Example University (2024)`,
    jobDescription: `Python Developer
Develop clean, well-tested Python services, automation pipelines, and REST APIs.

Required:
- Python, FastAPI, SQL, REST APIs, Pytest, Git

Preferred:
- Docker, Linux, PostgreSQL`,
  },
  {
    id: 'fresher-projects-only',
    label: 'Fresher CS Student (Projects Only — No Work Experience)',
    category: 'Fresher / Student',
    quality: 'Moderate',
    resumeText: `Siddharth Rao
Mysuru, India | +91 98000 88990 | siddharth.rao@example.com | github.com/siddharthrao

Objective
Final-year Computer Science student seeking an entry-level Software Engineer role to apply strong fundamentals in Java, Python, and web development.

Education
B.Tech in Computer Science & Engineering, Example University (Expected May 2026) | CGPA: 8.6/10

Technical Skills
Python, Java, C, SQL, HTML5, CSS3, JavaScript, React, Git

Projects
- Campus Event Portal: Built a full-stack event registration app with React, Python FastAPI, and SQLite.
- PathFinder Visualizer: Implemented BFS, DFS, and Dijkstra shortest-path visualizations in JavaScript.`,
    jobDescription: `Graduate Software Engineer (Entry-Level)
Looking for Computer Science graduates with strong programming fundamentals and project experience.

Required:
- Python or Java, SQL, JavaScript, Git
- Strong problem-solving and data structures fundamentals

Preferred:
- React, FastAPI, REST APIs`,
  },
  {
    id: 'fresher-weak-draft',
    label: 'Fresher Draft (Needs Improvement — Weak Bullets)',
    category: 'Fresher / Needs Polish',
    quality: 'Needs Improvement',
    resumeText: `Ritu Sharma
Jaipur, India | ritu.sharma@example.com

Summary
Hardworking student looking for a job in software development.

Education
B.Sc. Computer Science (2025)

Projects
- Did a college website project using HTML and CSS.
- Worked on a database assignment in MySQL.
- Helped teammates with presentation slides and documentation.`,
    jobDescription: `Junior Frontend Developer
We are looking for a junior developer with HTML5, CSS3, JavaScript, React, and Git skills.`,
  },
  {
    id: 'dotnet-dev',
    label: '.NET / C# Backend Developer',
    category: 'Backend Developer (.NET)',
    quality: 'Strong',
    resumeText: `Devika Menon
Chennai, India | +91 98000 99001 | devika.menon@example.com | linkedin.com/in/devikamenon-demo

Summary
.NET Backend Developer with 2 years of experience building enterprise REST APIs and background workers.

Technical Skills
C#, .NET, SQL, PostgreSQL, REST APIs, Docker, Git, CI/CD

Experience
Software Engineer (.NET) — FinCore Solutions (Jul 2024 – Present)
- Built ASP.NET Core Web APIs and BackgroundService workers processing 25,000+ daily payment webhooks.
- Improved SQL query throughput by 40% through parameterized stored procedures and connection pooling.

Projects
- LedgerSync Service: Implemented idempotent webhook ingestion in C# and Docker.

Education
B.E. in Computer Science, Example University (2024)`,
    jobDescription: `C# / .NET Backend Engineer
Build reliable APIs and background processing services on the .NET platform.

Required:
- C#, .NET, SQL, REST APIs, Git

Preferred:
- Docker, CI/CD, PostgreSQL`,
  },
  {
    id: 'devops-cloud',
    label: 'DevOps & Cloud Associate',
    category: 'DevOps Engineer',
    quality: 'Strong',
    resumeText: `Arjun Kapoor
Gurugram, India | +91 98000 10112 | arjun.kapoor@example.com | github.com/arjunkapoor

Summary
DevOps Associate with 1.5 years of experience automating CI/CD workflows, Docker builds, and Kubernetes deployments on AWS.

Technical Skills
Docker, Kubernetes, AWS, Linux, CI/CD, GitHub Actions, Python, Bash, Git

Experience
DevOps Engineer — InfraScale Cloud (Jan 2025 – Present)
- Automated build and test pipelines using GitHub Actions and Docker, cutting deployment time by 45%.
- Managed Kubernetes staging clusters on AWS and wrote Python health-check scripts for 12 microservices.

Projects
- ZeroDowntime Deploy Kit: Configured rolling Kubernetes deployments and Prometheus alert rules.

Education
B.Tech in Electronics & Communication, Example Institute (2024)`,
    jobDescription: `DevOps / Cloud Engineer
Automate infrastructure, CI/CD pipelines, and containerized production deployments.

Required:
- Docker, Kubernetes, AWS, Linux, CI/CD, Git

Preferred:
- Python, GitHub Actions, GCP`,
  },
  {
    id: 'qa-automation',
    label: 'QA Automation Engineer',
    category: 'QA Engineer',
    quality: 'Good',
    resumeText: `Meera Krishnan
Coimbatore, India | +91 98000 12123 | meera.krishnan@example.com | linkedin.com/in/meerakrishnan-demo

Summary
QA Automation Engineer experienced in Python Pytest API suites, JavaScript UI tests, and CI integration.

Technical Skills
Python, Pytest, JavaScript, Jest, Vitest, REST APIs, SQL, CI/CD, Git

Experience
QA Automation Engineer — QualityPulse Tech (Aug 2024 – Present)
- Built 110+ automated Pytest API tests validating status codes, JSON schemas, and edge cases.
- Integrated Jest and Vitest regression checks into CI/CD pipelines, catching 95% of UI regressions pre-release.

Projects
- API Contract Guard: Automated OpenAPI schema validation against staging microservices.

Education
B.Tech in Information Technology, Example College (2024)`,
    jobDescription: `QA Automation Engineer
Design and maintain automated API and UI test suites for web applications.

Required:
- Python, Pytest, JavaScript, REST APIs, Git, CI/CD

Preferred:
- Jest, Vitest, SQL, Docker`,
  },
];

export const SAMPLE_JOB_DESCRIPTIONS = SAMPLE_RESUMES.map((item) => ({
  id: `jd-${item.id}`,
  label: `${item.category} — ${item.label.split('(')[0].trim()}`,
  category: item.category,
  description: item.jobDescription,
}));

/* Optional text snippets only used when a user explicitly clicks "Load Sample" */
export const SAMPLE_RESUME_TEXT = SAMPLE_RESUMES[0].resumeText;

export const SAMPLE_JOB_DESCRIPTION = SAMPLE_RESUMES[0].jobDescription;
