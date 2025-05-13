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
  });

  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  const prompt = `
You will receive an audio transcript. First, generate a short and relevant title (5–8 words) that summarizes the overall topic or intent. Then, provide clean, concise bullet point notes with key takeaways or actions. Format your response like this:

Title: [Your title here]

- Bullet 1
- Bullet 2

Transcript:
"${transcript.text}"
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
