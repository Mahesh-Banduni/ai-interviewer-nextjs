import { NextResponse } from "next/server";
import { callGemini } from "@/app/lib/gemini";

export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name) {
       return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // const candidate = await prisma.candidate.findFirst({
    //     where: {
    //         candidateId: candidateId,
    //     }
    // })

    // if(!candidate){
    //     return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    // }

    // Create greeting + introduction question via Gemini
    const systemPrompt = `You are an interview assistant. Greet the candidate named ${name} with the short welcome in the interview and start the interview session, by asking them to introduce themselves in short. Output plain text: greeting + question.`;

    const aiRes = await callGemini(systemPrompt);
    let rawText = `Hello ${name}, please introduce yourself briefly?`;
    try {
      rawText =
        aiRes?.candidates?.[0]?.content?.parts?.[0]?.text ??
        aiRes?.text?.() ??
        rawText;
    } catch (e) {}

    return NextResponse.json({ question: rawText, difficultyLevel: 2, section: 'Introduction'},{status: 200});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
};
