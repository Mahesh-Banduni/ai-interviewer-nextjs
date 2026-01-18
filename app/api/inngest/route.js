import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {resumeParser} from "@/inngest/functions/resumeParser";
import { createInterviewProfile } from "@/inngest/functions/createInterviewProfile";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [resumeParser, createInterviewProfile],
});