import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { callGemini } from '@/app/lib/gemini';
import { includes } from 'zod';

export async function POST(req) {
  try {
    const body = await req.json();
    const { interviewId, candidate, remainingDuration, interviewDuration } = body;
    let previousQuestion = null;
    let interviewQuestions = null;

    if (!interviewId || !remainingDuration || !interviewDuration) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    interviewQuestions = await prisma.interviewQuestion.findMany({
        where: {
            interviewId: interviewId
        },
        select: {
          interviewQuestionId: true,
          content: true,
          candidateAnswer: true,
          correct: true,
          difficultyLevel: true,
          section: true,
          aiFeedback: true,
          askedAt: true
        },
        orderBy: {
          askedAt: 'asc'
        }
    })

    if(interviewQuestions.length>0){
        previousQuestion= interviewQuestions[interviewQuestions.length - 1];
    }

    const lastLevel = previousQuestion?.difficultyLevel ?? 2;

    const nextLevel =
      previousQuestion?.correct === true
        ? Math.min(5, lastLevel + 1)
        : previousQuestion?.correct === false
        ? Math.max(1, lastLevel - 1)
        : lastLevel;

const prompt = `
You are acting as an experienced professional interviewer in the field of 
${JSON.stringify(candidate?.resumeProfile?.jobArea?.name)}, conducting a real-world interview for the candidate described in:

RESUME:
${JSON.stringify(candidate?.resumeProfile)}

INTERVIEW HISTORY:
${JSON.stringify(interviewQuestions)}

INPUTS:
- interviewDuration: ${interviewDuration}     // Total session duration
- remainingDuration: ${remainingDuration}     // Remaining time in the session

### Session Timing Rules:
Use "interviewDuration" and "remainingDuration" to:
- Pace question difficulty
- Decide when to shift sections
- Ensure the interview completes all sections before time runs out
- Adjust depth based on how much time is left

### Session Structure:
The interview must include all three sections:
1. Skills-based
2. Work Experience / Projects-based
3. Personality-based

Rules:
- Track which sections have been used so far
- Select the next section based on: performance, remaining time, and unmet sections
- Avoid running out of time before covering all required sections

### Performance Evaluation (Automatic):
Evaluate performance automatically based on ALL prior answers + their difficulty:
- Strong → accurate responses to medium/high difficulty items
- Average → partially correct or correct low difficulty responses
- Weak → inaccurate or incomplete responses

Performance affects progression:
- Strong → increase difficulty faster
- Average → maintain current difficulty
- Weak → slow down and reinforce basics

### Question Generation Rules:
Produce ONE concise question (1–2 lines) that:
- Directly relates to the candidate’s skills, tools, projects, or certifications in the resume
- Connects naturally to their contributions
- Does NOT repeat or rephrase ANY question from interview history
- Matches the calculated difficulty level (1–5)
- Does NOT include: commentary, explanations, “difficulty level,” or “section” in the question text

### Output Format:
Respond strictly in JSON:
{
  "question": "...",          // Only the interview question
  "section": "...",           // Skills / Work Experience / Personality
  "difficultyLevel": "..."    // Difficulty level (1–5) for THIS question
}
`;

  const qRes = await callGemini(prompt);
    // Extract content from Gemini response safely
    let questionContent =
      qRes?.candidates?.[0]?.content?.parts?.[0]?.text ??
      qRes?.text?.() ??
      null;

    // Clean formatting
    if (typeof questionContent === "string") {
      questionContent = questionContent.replace(/```[\s\S]*?json/i, "").trim();
      questionContent = questionContent.replace(/```/g, "").trim();
    }

    let qJson = null;

    // Attempt to parse JSON strictly
    try {
      qJson = JSON.parse(questionContent);
    } catch {
      // Fallback: attempt to extract JSON object from messy text
      const match = questionContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          qJson = JSON.parse(match[0]);
        } catch {}
      }
    }

    console.log('This Question: ', qJson);

    return NextResponse.json(
      {
        previousQuestionFeedback: previousQuestion?.aiFeedback || "not available",
        question: qJson?.question ?? questionContent,
        section: qJson?.section ?? null,
        difficultyLevel: qJson?.difficultyLevel ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in Generating question: ',err);
    return NextResponse.json(
      { error: 'Error in processing request'},
      { status: 500 }
    );
  }
}
