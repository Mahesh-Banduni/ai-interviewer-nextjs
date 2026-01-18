import { NextResponse} from "next/server";
import prisma from "../../../../../lib/prisma";
import { inngest } from "@/inngest/client";

export async function POST(req) {
  try{
    const { interviewId, candidateId, completionMin } = await req.json();
    if (!interviewId || !candidateId || !completionMin) {
       return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const candidate = await prisma.candidate.findFirst({
      where: {
        candidateId: candidateId
      }
    })
    if(!candidate){
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    const interview = await prisma.interview.findFirst({
      where: {
        interviewId,
        candidateId,
        status: { in: ['PENDING', 'RESCHEDULED'] }
      }
    });

    if(!interview){
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const completionMinutes = parseFloat(completionMin);
    if (isNaN(completionMinutes)) {
      return NextResponse.json({ error: "Invalid completionMin value" }, { status: 400 });
    }

    const attemptedAt = new Date(Date.now() - completionMinutes * 60 * 1000);

    const updatedInterview = await prisma.interview.update({
      where: {
        interviewId: interviewId,
        candidateId: candidateId,
        status: { in: ['PENDING', 'RESCHEDULED'] }
      },
      data: {
        status: 'COMPLETED',
        completionMin: completionMinutes,
        attemptedAt: attemptedAt,
      }
    });

    if(!updatedInterview){
      return NextResponse.json({ error: "Error updating the interview status" }, { status: 400 });
    }
    await inngest.send({
      name: "interview/completed",
      data: { candidateId, interviewId },
    });
    return NextResponse.json({ message: "Interview completed successfully" }, { status: 200 });
    }
    catch(err){
      console.error(err);
      return NextResponse.json({ error: "Error processing request" }, { status: 500 });
    }
}
