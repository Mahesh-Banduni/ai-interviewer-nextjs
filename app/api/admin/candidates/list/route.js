import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(req) {
  try {
    // const { email, password, firstName, lastName } = await req.json();
    const candidates = await prisma.candidate.findMany({
      include: {
        resumeProfile: {
          include: {
            jobArea: true
          }
        },
      }
    });
    return NextResponse.json({ candidates },{status: 200});
  }
  catch (err) {
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}