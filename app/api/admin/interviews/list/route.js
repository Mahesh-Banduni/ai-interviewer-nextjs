import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(req) {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        candidate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json({ interviews },{status: 200});
  } catch (err) {
    console.log("Error in retrieving interview list:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}
