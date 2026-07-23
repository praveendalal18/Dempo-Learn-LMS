import { getOpenAI, isAIConfigured } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

export type AiGradeResult = {
  aiScore: number | null;
  aiFeedback: string | null;
};

/**
 * AI grading is opt-in. It runs only when AI_GRADING_ENABLED=true AND the AI
 * endpoint/key are configured. This keeps grading fully optional (e.g. off
 * until data-residency/compliance sign-off) without blocking submissions.
 */
function aiGradingEnabled(): boolean {
  return process.env.AI_GRADING_ENABLED === "true" && isAIConfigured();
}

/** The grading model — configurable so we can point at Sarvam (or any OpenAI-compatible model). */
function gradingModel(): string {
  return process.env.AI_GRADING_MODEL || "sarvam-105b";
}

/**
 * Grade a text submission with the AI model. Returns a suggested score out of
 * maxScore plus written feedback. Returns nulls when there is no text to grade
 * or the model call fails (grading is best-effort and never blocks submission).
 */
export async function gradeTextSubmission(
  assignmentTitle: string,
  assignmentDescription: string | null,
  maxScore: number,
  textResponse: string,
  rubric?: { name: string; description?: string; maxPoints: number }[] | null,
): Promise<AiGradeResult> {
  if (typeof textResponse !== "string" || textResponse.trim().length === 0) {
    return { aiScore: null, aiFeedback: null };
  }

  if (!aiGradingEnabled()) {
    return { aiScore: null, aiFeedback: null };
  }

  const rubricBlock =
    rubric && rubric.length
      ? `\nGrade strictly against this rubric (points per criterion):\n${rubric
          .map((c) => `- ${c.name} (max ${c.maxPoints})${c.description ? `: ${c.description}` : ""}`)
          .join("\n")}\nAward points per criterion and sum them for the score; reference the criteria in your feedback.\n`
      : "";

  const prompt = `You are an experienced teaching assistant grading a student submission.

Assignment: ${assignmentTitle}
${assignmentDescription ? `Instructions: ${assignmentDescription}` : ""}
Maximum score: ${maxScore}
${rubricBlock}
Student submission:
"""
${textResponse}
"""

Grade this submission. Respond ONLY with a JSON object of the exact shape:
{"score": <number between 0 and ${maxScore}>, "feedback": "<2-4 sentences of constructive feedback for the student>"}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: gradingModel(),
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a fair, rigorous grader. Always respond with valid JSON only, no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonText = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonText) as {
      score?: number;
      feedback?: string;
    };

    let score =
      typeof parsed.score === "number" ? parsed.score : null;
    if (score != null) {
      score = Math.max(0, Math.min(maxScore, score));
    }

    return {
      aiScore: score,
      aiFeedback:
        typeof parsed.feedback === "string" ? parsed.feedback : null,
    };
  } catch (err) {
    logger.error({ err }, "AI grading failed");
    return { aiScore: null, aiFeedback: null };
  }
}

/**
 * Score a short-answer quiz response with the AI model. Returns a suggested
 * score out of `points` plus brief feedback. Best-effort: returns nulls on
 * failure so submitting an attempt never blocks.
 */
export async function gradeShortAnswer(
  questionPrompt: string,
  points: number,
  answer: string,
): Promise<AiGradeResult> {
  if (typeof answer !== "string" || answer.trim().length === 0) {
    return { aiScore: 0, aiFeedback: "No answer provided." };
  }

  if (!aiGradingEnabled()) {
    return { aiScore: null, aiFeedback: null };
  }

  const prompt = `You are grading one short-answer quiz question.

Question: ${questionPrompt}
Maximum points: ${points}

Student answer:
"""
${answer}
"""

Respond ONLY with a JSON object of the exact shape:
{"score": <number between 0 and ${points}>, "feedback": "<1-2 sentences explaining the score>"}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: gradingModel(),
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "You are a fair, rigorous grader. Always respond with valid JSON only, no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonText = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonText) as {
      score?: number;
      feedback?: string;
    };

    let score = typeof parsed.score === "number" ? parsed.score : null;
    if (score != null) score = Math.max(0, Math.min(points, score));

    return {
      aiScore: score,
      aiFeedback: typeof parsed.feedback === "string" ? parsed.feedback : null,
    };
  } catch (err) {
    logger.error({ err }, "AI short-answer grading failed");
    return { aiScore: null, aiFeedback: null };
  }
}

/**
 * Compute a simple lexical-similarity plagiarism score (0-100) by comparing the
 * submission text against previously submitted texts for the same assignment.
 * Uses word-shingle Jaccard similarity; returns the highest match found.
 */
export function computePlagiarismScore(
  textResponse: string,
  otherTexts: string[],
): number | null {
  if (typeof textResponse !== "string" || textResponse.trim().length === 0) {
    return null;
  }

  const shingles = (text: string): Set<string> => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const set = new Set<string>();
    for (let i = 0; i < words.length - 2; i++) {
      set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    if (set.size === 0 && words.length > 0) {
      words.forEach((w) => set.add(w));
    }
    return set;
  };

  const target = shingles(textResponse);
  if (target.size === 0) return 0;

  let best = 0;
  for (const other of otherTexts) {
    const otherSet = shingles(other);
    if (otherSet.size === 0) continue;
    let intersection = 0;
    for (const s of target) {
      if (otherSet.has(s)) intersection++;
    }
    const union = target.size + otherSet.size - intersection;
    const jaccard = union === 0 ? 0 : intersection / union;
    if (jaccard > best) best = jaccard;
  }

  return Math.round(best * 100);
}
