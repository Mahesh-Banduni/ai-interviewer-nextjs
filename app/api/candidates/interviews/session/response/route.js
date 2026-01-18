// app/api/interview/question/route.js  (or wherever your current POST lives)
import { NextResponse } from 'next/server';
import { callGemini } from "@/app/lib/gemini";

/**
 * Helper: parse JSON returned by LLM robustly
 */
function parseJsonResponse(raw) {
  if (typeof raw !== "string") raw = JSON.stringify(raw);
  raw = raw.replace(/```[\s\S]*?json/i, "").replace(/```/g, "").trim();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch (e2) {
        parsed = null;
      }
    }
  }
  return parsed;
}

/**
 * Decision-layer prompt: classify answer as 'save', 'confirm', or 'discard'
 * Must return only valid JSON.
 */
function buildDecisionPrompt({ question, candidateAnswer }) {
  return `
You are a strict moderation and decisioning assistant for interviews. Given a candidate's answer OR follow-up message, decide which action to return:

Possible actions:
- "next_step": the candidate answer is related to the question field and can be graded/saved.
- "confirm": the candidate answer is irrelevant to the question field; ask the whether to continue.
- "proceed": the candidate answer has explicitly confirmed continuation using simple acknowledgments such as "sure", "yes", "yep", "go ahead", "ok", "alright", etc.

You MUST respond ONLY in JSON with THIS exact schema (no extra text):

{
  "action": "next_step" | "confirm" | "proceed",,
  "explanation": "<very very short reason>"
}

DEFINITIONS:
- "irrelevant" means the answer doesn't address the interview question at all (off-topic).
- "confirm" is for irrelevant answer.
- "proceed" ONLY applies when the candidate has clearly expressed explicit confirmation.

RULES:-
- Do not mention the 'Candidate' word in the 'action's' explanation. Give explanation as you are talking to the candidate directly.

Inputs:

Interview Question:
${question}

Candidate Answer:
${candidateAnswer}

Make a conservative decision: if you are uncertain whether to save, return "confirm". Keep JSON concise.
  `.trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      question,
      candidateAnswer,
      interviewId,
      candidateId
    } = body;

    if (!question || typeof candidateAnswer !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // fetch interview & candidate for context
    // const interview = await prisma.interview.findFirst({
    //   where: { interviewId: interviewId, candidateId: candidateId }
    // });
    // if (!interview) {
    //   return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    // }

    // const candidate = await prisma.candidate.findFirst({
    //   where: { candidateId: candidateId },
    //   include: { resumeProfile: true }
    // });
    // if (!candidate) {
    //   return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    // }

    // 1) Decision layer: call Gemini to decide what to do
    console.log('Question',question);
    console.log('Answer',candidateAnswer);
    const decisionPrompt = buildDecisionPrompt({ question, candidateAnswer });
    const dRes = await callGemini(decisionPrompt);
    let dRaw =
      dRes?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (typeof dRes?.text === "function" ? dRes.text() : dRes?.text) ??
      "";
    if (typeof dRaw !== "string") dRaw = JSON.stringify(dRaw);
    const dParsed = parseJsonResponse(dRaw) || {};
    console.log('dParsed', dParsed);

    // default fallback: when model fails, be conservative and require confirmation
    const action = (dParsed.action || "confirm").toLowerCase();
    console.log('Action',action);

    // If confirm and client has not sent proceed === true -> ask for confirmation
    if (action === 'confirm') {
      return NextResponse.json({
        action: 'confirm',
        message: `${dParsed.explanation}. Shall we go to the next question?`
      }, { status: 200 });
    }

    else if(action === 'proceed'){
        return NextResponse.json({
          action: 'proceed'
        }, { status: 200 });
    }

    else if(action === 'next_step'){
        return NextResponse.json({
          action: 'next_step'
        }, { status: 200 });
    }
     return NextResponse.json({
        action: 'confirm',
        message: 'I am sorry, but as an AI interviewer, I do not have information on that in particular. Shall we go to the next question?'
      }, { status: 200 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
