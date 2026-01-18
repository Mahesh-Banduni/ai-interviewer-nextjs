import { inngest } from "../client";
import prisma from "../../app/lib/prisma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const resumeParser = inngest.createFunction(
  { id: "process-resume" },
  { event: "pdf/uploaded" },
  async ({ event, step }) => {
    const candidateId = event.data.customUUID;
    const buffer = Buffer.from(event.data.pdfBuffer);

    // Extract resume text
    const resumeText = await step.run("extract-pdf", async () => {
      const blob = new Blob([buffer], { type: "application/pdf" });
      const loader = new PDFLoader(blob, { splitPages: false });
      const docs = await loader.load();
      return docs.map((d) => d.pageContent).join("\n\n");
    });

    // Get job areas from DB
    const jobAreas = await prisma.jobAreas.findMany({
      select: { name: true },
    });
    
    const jobAreaNames = jobAreas.map(j => j.name);

    // Gemini resume parsing
    const structured = await step.run("gemini-parse-resume", async () => {
      const prompt = `
You are an expert resume parser. Your task is to convert the resume text into a clean, strictly valid JSON object that follows the exact structure and naming of the provided Prisma model.

========================================
PRISMA MODEL (RETURN JSON MUST MATCH)
========================================
{
  "profileTitle": String?,
  "jobAreaId": String,
  "technicalSkills": Json?,
  "otherSkills": Json?,
  "experienceSummary": [
    {
      "dates": String,
      "title": String,
      "company": String,
      "location": String,
      "responsibilities": Array<String>
    }
  ],
  "educationSummary": String?,
  "certifications": Json?,
  "projects": [
    {
      "name": String,
      "description": Array<String>
    }
  ]
}

========================================
STRICT OUTPUT RULES
========================================
1. OUTPUT MUST BE ONLY valid JSON — no Markdown, no comments.
2. DO NOT wrap output inside \`\`\`json or any code fences.
3. DO NOT hallucinate — if missing, return null or [].
4. Do not include fields not defined in the model.
5. Output must be valid JSON with no trailing commas.
6. technicalSkills must be classified into categories (e.g., Frontend, Backend, Database, DevOps & Cloud etc.) and each category must contain short technology names only.
7. Select jobAreaId based on the closest matching job area from the provided job area list.

========================================
INPUT RESUME
========================================
"""${resumeText}"""

INPUT LIST OF JOB AREAS
========================================
"""${JSON.stringify(jobAreaNames)}"""

========================================
TASK
========================================
Return ONLY the final JSON object.
`;

      const result = await geminiModel.generateContent(prompt);
      let output = result.response.text().trim();

      // Cleanup formatting issues
      output = output
        .replace(/```json/i, "")
        .replace(/```/g, "")
        .trim();

      // Parse JSON safely
      try {
        return JSON.parse(output);
      } catch (err) {
        console.error("Gemini returned invalid JSON:", output);

        const cleaned = output
          .replace(/\n/g, " ")
          .replace(/\t/g, " ")
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");

        try {
          return JSON.parse(cleaned);
        } catch (err2) {
          throw new Error("Gemini output was not valid JSON");
        }
      }
    });

    const jobArea = await prisma.jobAreas.findFirst({
      where: {
        name: {
          contains: structured.jobAreaId,
          mode: 'insensitive',
        },
      },
    });

    // Save to DB
    await step.run("save-to-db", async () => {
      await prisma.resumeProfile.create({
        data: {
          candidateId,
          jobAreaId: jobArea.jobAreaId,
          profileTitle: toTitleCase(structured.profileTitle),
          technicalSkills: structured.technicalSkills,
          otherSkills: structured.otherSkills,
          experienceSummary: structured.experienceSummary,
          educationSummary: structured.educationSummary,
          certifications: structured.certifications,
          projects: structured.projects,
        },
      });
    });

    return { success: true, parsed: structured };
  }
);
