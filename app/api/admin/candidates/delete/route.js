import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function DELETE(req) {
  try {
    const { candidateId } = await req.json();

    if (!candidateId) {
      return NextResponse.json(
        { error: "Missing candidate ID" },
        { status: 400 }
      );
    }

    // 1. Delete interview questions -> interviews -> interview profiles
    await prisma.interviewQuestion.deleteMany({
      where: { interview: { candidateId } }
    });

    await prisma.interviewProfile.deleteMany({
      where: { candidateId }
    });

    await prisma.interview.deleteMany({
      where: { candidateId }
    });

    // 2. Delete the resume profile
    await prisma.resumeProfile.deleteMany({
      where: { candidateId }
    });

    // 3. Delete the candidate record
    const deletedCandidate = await prisma.candidate.delete({
      where: { candidateId }
    });

    const deletedUser = await prisma.user.delete({
      where: { userId: candidateId }
    });

    return NextResponse.json({ deletedUser }, { status: 200 });
  } catch (err) {
    console.error("DELETE CANDIDATE ERROR:", err);
    return NextResponse.json(
      { error: "Error processing request" },
      { status: 500 }
    );
  }
}
