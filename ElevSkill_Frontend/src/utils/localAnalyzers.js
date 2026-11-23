const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are',
  'was', 'were', 'will', 'have', 'has', 'had', 'our', 'not', 'but', 'all',
  'any', 'can', 'use', 'using', 'used', 'work', 'working', 'team', 'role',
  'into', 'about', 'more', 'than', 'also', 'such', 'well', 'able', 'new',
  'who', 'what', 'when', 'where', 'how', 'experience', 'knowledge', 'skills',
  'looking', 'join', 'requirements', 'bonus', 'solid', 'foundation',
]);

function extractKeywords(text) {
  if (!text || !text.trim()) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  return Array.from(new Set(tokens));
}

export function analyzeResumeLocally(resumeText, jobText) {
  const cleanResume = (resumeText || '').trim();
  const cleanJob = (jobText || '').trim();

  const words = cleanResume ? cleanResume.split(/\s+/).length : 0;
  const hasMetrics = /\d+%|\d+\+|\$\d+|\d+x/i.test(cleanResume);
  const actionVerbs = [
    'built', 'designed', 'implemented', 'improved', 'created',
    'developed', 'led', 'collaborated', 'optimized', 'automated',
  ];
  const foundVerbs = actionVerbs.filter((v) => cleanResume.toLowerCase().includes(v));

  const jobKeywords = extractKeywords(cleanJob);
  const resumeLower = cleanResume.toLowerCase();

  const matchedKeywords = jobKeywords.filter((kw) => resumeLower.includes(kw));
  const missingKeywords = jobKeywords.filter((kw) => !resumeLower.includes(kw));

  let score = 45;
  if (words >= 80) score += 12;
  if (words >= 150) score += 8;
  if (hasMetrics) score += 12;
  score += Math.min(10, foundVerbs.length * 2);

  if (jobKeywords.length > 0) {
    const ratio = matchedKeywords.length / jobKeywords.length;
    score = Math.round(score * 0.65 + ratio * 100 * 0.35);
  }
  score = Math.max(15, Math.min(98, score));

  const strengths = [];
  if (foundVerbs.length >= 3) {
    strengths.push(`Uses strong action verbs (${foundVerbs.slice(0, 4).join(', ')}).`);
  }
  if (hasMetrics) {
    strengths.push('Includes measurable numbers or impact metrics.');
  }
  if (words >= 100) {
    strengths.push(`Good detail length (${words} words) for a student/new-grad resume.`);
  }
  if (matchedKeywords.length > 0) {
    strengths.push(`Matches ${matchedKeywords.length} keyword(s) from the target job description.`);
  }
  if (strengths.length === 0) {
    strengths.push('Resume text was received and checked locally.');
  }

  const suggestions = [];
  if (!hasMetrics) {
    suggestions.push('Add 1–2 quantified results (e.g., "400+ users", "reduced load time by 25%").');
  }
  if (foundVerbs.length < 3) {
    suggestions.push('Start bullet points with strong action verbs like Built, Implemented, or Improved.');
  }
  if (words < 90) {
    suggestions.push('Expand your project or coursework bullets with tech stack and outcomes.');
  }
  if (missingKeywords.length > 0) {
    suggestions.push(
      `Consider naturally incorporating missing role terms if you have them: ${missingKeywords
        .slice(0, 6)
        .join(', ')}.`
    );
  }

  return {
    score,
    wordCount: words,
    matchedKeywords: matchedKeywords.slice(0, 14),
    missingKeywords: missingKeywords.slice(0, 12),
    strengths,
    suggestions,
  };
}

export function evaluateInterviewAnswerLocally(answerText, questionObj) {
  const clean = (answerText || '').trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const lower = clean.toLowerCase();

  const expectedKeywords = questionObj?.keywords || [];
  const hitKeywords = expectedKeywords.filter((kw) => lower.includes(kw));

  let clarityLabel = 'Needs More Detail';
  if (words >= 45 && words <= 180) {
    clarityLabel = 'Well-Paced Length';
  } else if (words > 180) {
    clarityLabel = 'Detailed (Consider Trimming)';
  } else if (words >= 20) {
    clarityLabel = 'Concise Draft';
  }

  const score = Math.min(
    96,
    Math.max(
      25,
      Math.round((Math.min(words, 90) / 90) * 55 + (hitKeywords.length / Math.max(1, expectedKeywords.length)) * 45)
    )
  );

  const feedbackPoints = [];
  if (words < 35) {
    feedbackPoints.push('Try expanding your answer to 60–120 words with a concrete example.');
  } else {
    feedbackPoints.push(`Answer length is ${words} words — easy to deliver in ~45–90 seconds.`);
  }

  if (hitKeywords.length > 0) {
    feedbackPoints.push(`Covered relevant concepts: ${hitKeywords.join(', ')}.`);
  } else {
    feedbackPoints.push('Include specific technical or STAR terms relevant to the question.');
  }

  if (!/result|impact|learned|improved|outcome/i.test(clean)) {
    feedbackPoints.push('End with the measurable outcome or what you learned from the experience.');
  }

  return {
    score,
    wordCount: words,
    clarityLabel,
    hitKeywords,
    feedbackPoints,
  };
}

export function compareResumeAndJobLocally(resumeText, jobText) {
  const jobKeywords = extractKeywords(jobText);
  const resumeKeywords = extractKeywords(resumeText);
  const resumeLower = (resumeText || '').toLowerCase();

  const matched = jobKeywords.filter((kw) => resumeLower.includes(kw));
  const missing = jobKeywords.filter((kw) => !resumeLower.includes(kw));

  const matchPercent =
    jobKeywords.length > 0 ? Math.round((matched.length / jobKeywords.length) * 100) : 0;

  let readiness = 'Low Overlap';
  if (matchPercent >= 70) readiness = 'Strong Overlap';
  else if (matchPercent >= 45) readiness = 'Moderate Overlap';

  return {
    matchPercent,
    readiness,
    totalJobKeywords: jobKeywords.length,
    totalResumeKeywords: resumeKeywords.length,
    matched: matched.slice(0, 18),
    missing: missing.slice(0, 18),
  };
}
