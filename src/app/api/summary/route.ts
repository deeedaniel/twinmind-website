import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Summarizes the transcript and saves it to the database
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Taking in from frontend
  const { transcriptId, title, notes } = await req.json();

  console.log("title", title);
  console.log("notes", notes);

  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    include: { user: true },
  });

  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  const prompt = `
You will receive a raw audio transcript of a user's voice recording, along with optional user-provided notes and a custom title.

Your task is to extract and summarize the main points of the transcript. Use the notes to guide your summary if they provide helpful context. Ignore filler phrases, greetings (e.g., "hello", "1,2,3"), or anything unrelated to a real topic or idea.

User's Title: ${title || "Untitled"}
User's Notes: ${notes || "None"}

Transcript:
"""${transcript.text}"""

Steps:
1. Generate a short, relevant title (5–8 words). If the user provided a helpful title, you may reuse or refine it.
2. Write clear, concise bullet point notes summarizing the key points or ideas from the transcript. Incorporate the user’s notes if relevant.
3. Only include action items if the transcript or notes suggest next steps or priorities.
4. If no meaningful content is found, return:

Title: Untitled  
• Transcript is too short or has no meaningful content.

Format:
Title: [Generated or Refined Title]
• Bullet point 1
• Bullet point 2
  • Sub-bullet (if needed)

Action Items (if any):
1. ...
2. ...
`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await openaiRes.json();
  const fullContent = data.choices[0].message.content;

  const summaryTitle =
    title?.trim() ||
    fullContent.split("\n")[0]?.split(":")[1]?.trim() ||
    "Untitled";

  // Remove title from text
  const summaryText = fullContent
    .split("\n") // split into lines
    .slice(1) // skip the first line (the title)
    .join("\n") // join remaining lines back into text
    .trim(); // clean up whitespace

  const saved = await prisma.summary.upsert({
    where: { transcriptId },
    update: { summaryText, summaryTitle },
    create: {
      transcriptId,
      summaryText,
      summaryTitle,
    },
  });

  return NextResponse.json({ summaryTitle, summaryText });
}
