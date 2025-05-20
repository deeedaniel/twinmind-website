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
  const { transcriptId, title, notes, text } = await req.json();

  console.log("title", title);
  console.log("notes", notes);

  let transcriptText: string | null = null;

  if (transcriptId) {
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

    transcriptText = transcript.text;
  } else if (text) {
    transcriptText = text;
  } else {
    return NextResponse.json(
      { error: "No transcript or text provided" },
      { status: 400 }
    );
  }

  const prompt = `
You will receive a raw audio transcript of a user's voice recording, along with optional user-provided notes and a custom title.

Your task is to extract and summarize the main points of the transcript. Use the notes to guide your summary if they provide helpful context. Ignore filler phrases, greetings (e.g., "hello", "1,2,3"), or anything unrelated to a real topic or idea.

User's Title: ${title || "Untitled"}
User's Notes: ${notes || "None"}

Transcript:
"""${transcriptText}"""

Steps:
1. Generate a short, relevant title (5–8 words). If the user provided a helpful title, you may reuse or refine it.
2. Write clear, concise bullet point notes summarizing the key points or ideas from the transcript. Incorporate the user’s notes if relevant.
3. Only include action items if the transcript or notes suggest next steps or priorities.
4. Identify and output any **action items** as Markdown checkboxes (e.g., "- [ ] Do this"), except for the title.

Title: [Generated or Refined Title]

**Summary:**

+ Main point 1
+ Main point 2
  + Sub-point (if applicable)

**Action Items:**

- [ ] First actionable item
- [ ] Second actionable item

If no meaningful content is found, return:

Title: Untitled  
• Transcript is too short or has no meaningful content.
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

  // Only save if private mode is OFF, aka no transcriptId from save-transcript
  if (transcriptId) {
    const saved = await prisma.summary.upsert({
      where: { transcriptId },
      update: { summaryText, summaryTitle, summaryNotes: notes },
      create: {
        transcriptId,
        summaryText,
        summaryTitle,
        summaryNotes: notes,
      },
    });
  }

  return NextResponse.json({ summaryTitle, summaryText });
}
