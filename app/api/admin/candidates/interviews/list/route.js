import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function POST(req) {
    try{
        const {candidateId, interviewId} = await req.json();
        if (!candidateId) {
            return NextResponse.json({ error: "Missing candidate ID" }, { status: 400 });
        }
        const interviews = await prisma.interview.findMany({
            where: {
              candidateId,
              ...(interviewId && { interviewId })
            },
            select: {
                interviewId: true,
                scheduledAt: true,
                durationMin: true,
                status: true,
                cancelledAt: true,
                cancellationReason: true,
                candidate: {
                  select:{
                    candidateId: true,
                    firstName: true,
                    lastName: true
                  }
                },
                interviewProfile: {
                  select:{
                    performanceScore: true,
                    analytics: true,
                    recommendedRoles: true,
                    strengths: true,
                    weaknesses: true
                  }
                },
                questions: {
                  select:{
                    content: true,
                    candidateAnswer: true,
                    aiFeedback: true,
                    difficultyLevel: true,
                    correct: true
                  }
                },
                admin: {
                    select:{
                        firstName: true,
                        lastName: true
                    }
                }
            }
        })
        if (!candidateId) {
            return NextResponse.json({ error: "Candidate does not exist" }, { status: 404 });
        }
        return NextResponse.json({message: 'List of interviews retrieved', interviews: interviews},{status: 200})
    }
    catch(error){
        console.error("Error fetching candidate interview details", error);
        return NextResponse.json({ error: "Error processing request" }, { status: 500 });
    }
} 