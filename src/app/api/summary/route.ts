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

  const { transcriptId } = await req.json();

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
You will receive a raw audio transcript of a user's voice recording.

Your task is to extract and summarize the main points of the transcript. Ignore filler phrases, greetings (e.g., "hello", "1,2,3"), or anything unrelated to a real topic or idea.

Steps:
1. Generate a short, relevant title (5–8 words) only if the content has clear intent.
2. Write clear, concise bullet point notes summarizing the key points or ideas. 
3. Only include action items if the transcript naturally suggests next steps or priorities.
4. In the action items, include any possible due dates or deadlines.

If the transcript is not super meaningful, return a short title and a singular bullet point.

Format your response like this (only if content is meaningful):

Title: [Concise title]

• Bullet 1
• Bullet 2
  • Sub-bullet (if needed)

Action Items (if needed):
1. Action 1
2. Action 2

If the transcript is genuinely meaningless, return a title "Untitled" and a short message "Transcript is too short or has no meaningful content":

Title: Untitled

• Transcript is too short or has no meaningful content.

Transcript:
"""${transcript.text}"""
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
    fullContent.split("\n")[0]?.split(":")[1]?.trim() || "Untitled";

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

  return NextResponse.json(saved);
}
