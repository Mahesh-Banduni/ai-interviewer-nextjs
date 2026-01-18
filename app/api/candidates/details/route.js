import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function POST(req) {
  try {
    const { candidateId } = await req.json();
    const candidate = await prisma.candidate.findFirst({
      where:{
        candidateId: candidateId
      },
      include: {
        resumeProfile: {
          include: {
            jobArea: true
          }
        },
      }
    });
    return NextResponse.json({ candidate },{status: 200});
  }
  catch (err) {
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}