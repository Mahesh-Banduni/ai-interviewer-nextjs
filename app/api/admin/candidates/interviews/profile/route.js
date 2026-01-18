import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function POST(req) {
  try {
    const { candidateId } = await req.json();
    if (!candidateId) {
        return NextResponse.json({ error: "Missing candidate ID" }, { status: 400 });
    }
    const candidateResumeProfile = await prisma.interviewProfile.findFirst({
      where: {
        candidateId: candidateId
      },
      select: {
        certifications: true,
        experienceSummary: true,
        educationSummary: true,
        technicalSkills: true,
        otherSkills: true,
        projects: true,
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });
    return NextResponse.json({ candidateResumeProfile },{status: 200});
  }
  catch (err) {
    console.error("Error fetching candidate resume profile:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}