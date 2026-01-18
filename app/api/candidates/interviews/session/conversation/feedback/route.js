import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { callGemini } from "@/app/lib/gemini";

export async function POST(req) {
  try {
    const { question, candidateAnswer, difficultyLevel, interviewId, resumeProfile, section } = await req.json();
    let savedQuestion= null;
    if (!question || typeof candidateAnswer !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    let grade = {};
    if(section !== 'Introduction')
  {
    const prompt = `You are an expert technical interviewer and hiring evaluator. You will assess a candidate's interview answer based on the question, difficulty, section, and resume context.

You MUST respond **only in valid JSON** and follow this schema:

{
  "correct": "true | false",
  "aiFeedback": string,
}

DEFINITIONS:
- correct:
    true → candidate answered well and shows competency
    fail → insufficient or incorrect understanding
- aiFeedback: 
    Only one very short few 6-8 words sentence of generic like "Good job." Be precise and instructional.

You will be given:
- A resume extract (may be empty)
- The interview question
- Candidate’s answer
- Difficulty level

Evaluate the answer carefully. If the answer is vague, missing depth, or partially correct, reflect that honestly.

Now evaluate:

Resume:
${JSON.stringify(resumeProfile)}

Interview Question (difficulty {${difficultyLevel}}/5):
{${question}}

Question belongs to section:
{${section}}

Candidate Answer:
{${candidateAnswer}}
`
    const gRes = await callGemini(prompt);
    let raw =
      gRes?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (typeof gRes?.text === "function" ? gRes.text() : gRes?.text) ??
      "";
    
    if (typeof raw !== "string") {
      raw = JSON.stringify(raw);
    }
    
    // strip code fences just in case
    raw = raw.replace(/```[\s\S]*?json/i, "").replace(/```/g, "").trim();
    
    // Default grade values
    grade = {
      correct: 'false',
      aiFeedback: 'No feedback generated'
    };

    try {
      grade = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          grade = JSON.parse(jsonMatch[0]);
        } catch {}
      } else {
        grade.aiFeedback = raw.slice(0, 500);
      }
    }
  }

    savedQuestion = await prisma.interviewQuestion.create({
        data: {
            interviewId: interviewId,
            content: question,
            candidateAnswer: candidateAnswer,
            aiFeedback: section == 'Introduction' ? "Great" : grade.aiFeedback,
            correct: section == 'Introduction' ? true : Boolean(grade.correct),
            difficultyLevel: difficultyLevel,
            section: section
        }
    })

    console.log('Saved question: ',savedQuestion);

    return NextResponse.json({ interviewQuestion: savedQuestion },{status: 200});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
