import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { inngest } from "@/inngest/client";
import B2 from "backblaze-b2";
import bcrypt from "bcrypt";

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const email = formData.get("email");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const phoneNumber = formData.get("phoneNumber");
    const resume = formData.get("resume");
    const adminId = formData.get("adminId");

    if( !email || !firstName || !lastName || !resume){
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const customUUID = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(`${firstName}@123`, 10);

    await b2.authorize();

    const buffer = Buffer.from(await resume.arrayBuffer());
    const uniqueFileName = `${Date.now()}-resume`;
    const arrayBuffer = await resume.arrayBuffer();

    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    await b2.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: `documents/${uniqueFileName}`,
      data: buffer,
      contentType: resume.type,
    });

    const fileUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/documents/${uniqueFileName}`;

    await inngest.send({
      name: "pdf/uploaded",
      data: { customUUID, pdfBuffer: Array.from(new Uint8Array(arrayBuffer)) },
    });

    const user = await prisma.user.create({
      data:{
        userId: customUUID,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone: phoneNumber,
        roleId: 2
      }
    })

    const newCandidate = await prisma.candidate.create({
      data: {
        candidateId: user.userId,
        email,
        firstName,
        lastName,
        status: "NEW",
        phone: phoneNumber,
        resumeUrl: fileUrl,
        adminId: adminId
      }
    });
    return NextResponse.json({ newCandidate },{status: 201});
  }
  catch (err) {
    console.log("Error in creating candidate:", err);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}