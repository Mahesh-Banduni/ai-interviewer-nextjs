import nodemailer from 'nodemailer';
import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SECURE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Wrap in an async IIFE so we can use await.
const sendMail = async ({
  candidateEmail,
  candidateName,
  loginUrl,
  candidatePassword,
  meetingTime
}) => {
  const info = await transporter.sendMail({
    from: `"AI Interviewer" <${process.env.SMTP_USER}>`,
    to: candidateEmail,
    subject: "Interview Invitation",
    text:
      `Dear ${candidateName},\n\n` +
      `We’re pleased to invite you for an interview scheduled on ${meetingTime}.\n\n` +
      `To proceed, please log in to your account using the following credentials:\n\n` +
      `Login URL: ${loginUrl}\n` +
      `Email: ${candidateEmail}\n` +
      `Password: ${candidatePassword}\n\n` +
      `Once logged in, your scheduled interview details will be available in the Interview section.\n\n` +
      `If you have any questions or issues, please reply to this email.\n\n` +
      `Best regards,\n` +
      `AI Interviewer\n`,
    html:
      `<p>Dear ${candidateName},</p>
      <p>We’re pleased to invite you for an interview scheduled on <strong>${meetingTime}</strong>.</p>
      <p>To proceed, please log in to your account using the credentials below:</p>
      <ul>
        <li><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
        <li><strong>Email:</strong> ${candidateEmail}</li>
        <li><strong>Password:</strong> ${candidatePassword}</li>
      </ul>
      <p>After logging in, you can view your scheduled interview details in the Interview section.</p>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>We look forward to speaking with you!</p>
      <p>Best regards,<br/>
      AI INTERVIEWER<br/>`
  });

  console.log("Message sent:", info.messageId);
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    const day = date.getDate();
    const daySuffix = (d => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    })(day);

    const options = { month: 'long', hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedDateParts = date.toLocaleString('en-US', options).split(' ');

    const formattedDate = `${formattedDateParts[0]} ${day}${daySuffix}, ${date.getFullYear()}, ${formattedDateParts[2]} ${formattedDateParts[3]}`;

    return formattedDate;
  }

export async function POST(req) {
  try {
    const formData = await req.formData();
    const candidateId = formData.get("candidateId");
    const datetime = formData.get("datetime");
    const duration = formData.get("duration");
    const adminId = formData.get("adminId");

    if( !candidateId || !datetime || !duration){
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const candidate = await prisma.candidate.findFirst({
        where: {
            candidateId: candidateId
        }
    })

    const interview = await prisma.interview.create({
      data:{
        candidateId: candidateId,
        scheduledAt: datetime,
        durationMin: Number(duration),
        adminId: adminId,
        status: 'PENDING'
      }
    })

    const updatedCandidate = await prisma.candidate.update({
      where:{
          candidateId: interview.candidateId
      },
      data: {
        status: "INTERVIEW_SCHEDULED",
      }
    });

    const sendInterviewMail = async({candidate, interview}) => {
        await sendMail({candidateEmail: candidate.email,
            candidateName: candidate.firstName+' '+candidate.lastName,
            loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin`,
            candidatePassword: `${candidate.firstName}@123`,
            meetingTime: formatDate(interview.scheduledAt)
        });
    }
    sendInterviewMail({candidate, interview});
    return NextResponse.json({ interview }, {status: 201});
  }
  catch (err) {
    console.log("Error in scheduling interview:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}