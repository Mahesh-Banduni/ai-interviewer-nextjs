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
  meetingTime,
  oldMeetingTime
}) => {
  const subject = "Interview Rescheduled";

  const textMessage = `Dear ${candidateName},\n\n` +
      `Your interview has been rescheduled.\n\n` +
      `Old Timing: ${oldMeetingTime}\n` +
      `New Timing: ${meetingTime}\n\n` +
      `Please log in using your existing credentials to view updated interview details.\n\n` +
      `Login URL: ${loginUrl}\n\n` +
      `Best regards,\nAI Interviewer\n`
    ;

  const htmlMessage = `
      <p>Dear ${candidateName},</p>
      <p>Your interview has been <strong>rescheduled</strong>.</p>
      <p>
        <strong>Old Timing:</strong> ${oldMeetingTime}<br/>
        <strong>New Timing:</strong> ${meetingTime}
      </p>
      <p>Please log in using your existing credentials to view updated interview details:</p>
      <ul>
        <li><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
      </ul>
      <p>Best regards,<br/>AI Interviewer</p>
    `;

  const info = await transporter.sendMail({
    from: `"AI Interviewer" <${process.env.SMTP_USER}>`,
    to: candidateEmail,
    subject,
    text: textMessage,
    html: htmlMessage
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

export async function PUT(req) {
  try {
    const formData = await req.formData();
    const candidateId = formData.get("candidateId");
    const interviewId = formData.get("interviewId");
    const newDatetime = formData.get("newDatetime");
    const oldDatetime = formData.get("oldDatetime");
    const duration = formData.get("duration");
    const adminId = formData.get("adminId");

    if( !candidateId || !newDatetime || !duration){
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const candidate = await prisma.candidate.findFirst({
        where: {
            candidateId: candidateId
        }
    })

    const updatedInterview = await prisma.interview.update({
        where:{
            candidateId: candidateId,
            interviewId: interviewId
        },
      data:{
        scheduledAt: newDatetime,
        durationMin: Number(duration),
        status: 'RESCHEDULED'
      }
    })

    const sendInterviewMail = async({candidate, updatedInterview}) => {
        await sendMail({candidateEmail: candidate.email,
            candidateName: candidate.firstName+' '+candidate.lastName,
            loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin`,
            candidatePassword: `${candidate.firstName}@123`,
            meetingTime: formatDate(updatedInterview.scheduledAt),
            oldMeetingTime: formatDate(oldDatetime)
        });
    }
    sendInterviewMail({candidate, updatedInterview});
    return NextResponse.json({ updatedInterview }, {status: 200});
  }
  catch (err) {
    console.log("Error in rescheduling interview:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}