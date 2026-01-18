import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function POST(request, { params }) {
  try {
    const { interviewId } = await params;
    const {candidateId} = await request.json();
    if (!interviewId || !candidateId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const interview = await prisma.interview.findFirst({
      where: {
        interviewId,
        candidateId
      },
      select: {
        interviewId: true,
        durationMin: true,
        candidate: {
          select:{
            candidateId: true,
            firstName: true,
            lastName: true
          }
        },
        admin: {
          select:{
            firstName: true,
            lastName: true
          }
        }
      }
    });
    if(!interview){
        return NextResponse.json({error: 'Interview not found'}, {status: 400});
    }
    return NextResponse.json({ interview }, { status: 200 });
  } catch (err) {
    console.log("Error in retrieving interview details:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}
