import { inngest } from "../client";
import prisma from "../../app/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export const createInterviewProfile = inngest.createFunction(
  { id: "generate-interview-profile" },
  { event: "interview/completed" },
  async ({ event, step }) => {
    const candidateId = event.data.candidateId;
    const interviewId = event.data.interviewId;

    const [candidate] = await step.run(
      "fetch-db-data",
      async () => {
         const candidate = await prisma.candidate.findFirst({
          where: {
            candidateId,
            interviews: {
              some: {
                interviewId
              }
            }
          },
          include: {
            resumeProfile: true,
            interviews: {
              where: {
                interviewId
              },
              include: {
                questions: true
              }
            }
          }
        })

        return [candidate];
      }
    );

    const structuredInterviewData = {
      interviewMeta: {
        candidate: {
          firstName: candidate?.firstName,
          lastName: candidate?.lastName,
        },
        scheduledAt: candidate?.interviews?.scheduledAt,
        durationMin: candidate?.interviews?.durationMin,
      },
      QnA: candidate?.interviews[0]?.questions?.map((q) => ({
        question: q?.content,
        difficulty: q?.difficultyLevel,
        answer: q?.candidateAnswer,
        aiFeedback: q?.aiFeedback,
        correct: q?.correct,
      })),
    };

const aiAnalysis = await step.run(
  "gemini-generate-interview-profile",
  async () => {
const prompt = `
You are an expert senior hiring evaluator with broad cross-industry assessment capabilities. Your task is to objectively evaluate the candidate based on their resume profile and interview Q&A performance, regardless of professional field or specialization.

========================================
RESUME PROFILE
========================================
${JSON.stringify(candidate.resumeProfile, null, 2)}

========================================
INTERVIEW Q/A & FEEDBACK
========================================
${JSON.stringify(structuredInterviewData, null, 2)}

========================================
PERFORMANCE SCORING CRITERIA (0–100)
========================================
PerformanceScore must be determined by the following weighted evaluation model:
- Accuracy & Reliability of Responses (0–30): correctness and factual integrity.
- Depth of Domain Knowledge (0–25): conceptual understanding and reasoning depth.
- Problem-Solving & Decision-Making Approach (0–15): structured logical thinking and ability to resolve challenges.
- Communication Clarity (0–10): ability to express ideas clearly and professionally.
- Practical Experience (0–10): real-world application within their domain.
- Confidence & Professional Composure (0–5): self-assurance and calm reasoning.
- Learning & Adaptability (0–5): ability to grow, reflect, and incorporate feedback.

========================================
OUTPUT STRICT JSON IN THIS FORMAT
========================================
{
  "performanceScore": Float (0–100),
  "domainFit": Json,
  "recommendedRoles": Json,
  "strengths": Json,
  "weaknesses": Json,
  "analytics": {
    "totalQuestions": String,
    "correctAnswers": String,
    "averageDifficulty": Float
  }
}

========================================
RULES
========================================
- Output JSON only.
- No explanation or backticks.
- Do not add or modify fields.
- If any data is missing → return null.
- Return only 2–3 recommended roles.
- Strengths and weaknesses must contain 2–4 words each.
- The output must be strictly valid JSON.
`;

        const result = await geminiModel.generateContent(prompt);
        let output = result.response.text().trim();

        output = output
          .replace(/^```json/i, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim();

        return JSON.parse(output);
      }
    );


    await step.run("save-interview-profile", async () => {
      await prisma.interviewProfile.create({
        data: {
          interviewId,
          candidateId,
          performanceScore: aiAnalysis.performanceScore,
          recommendedRoles: aiAnalysis.recommendedRoles,
          strengths: aiAnalysis.strengths,
          weaknesses: aiAnalysis.weaknesses,
          analytics: aiAnalysis.analytics,
        },
      });
    });

    return { success: true };
  }
);
