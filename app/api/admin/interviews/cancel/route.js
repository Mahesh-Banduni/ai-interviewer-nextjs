import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function PUT(req) {
  try {
    const {interviewId, cancellationReason} = await req.json();
    if (!interviewId) {
        return NextResponse.json({ error: "Missing interview ID" }, { status: 400 });
    }
    const interview = await prisma.interview.update({
      where: {
        interviewId: interviewId
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || "Interviewer unavailable due to emergency"
      }
    });
    return NextResponse.json({ interview },{status: 200});
  } catch (err) {
    console.log("Error in retrieving interview list:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}
