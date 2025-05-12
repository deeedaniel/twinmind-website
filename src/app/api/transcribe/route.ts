import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as Blob;

  if (!audio) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());

  // 🧠 Step 1: Transcribe using Whisper
  const openaiTranscribe = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      body: (() => {
        const fd = new FormData();
        fd.append(
          "file",
          new Blob([buffer], { type: "audio/webm" }),
          "audio.webm"
        );
        fd.append("model", "whisper-1");
        return fd;
      })(),
    }
  );

  const transcriptionData = await openaiTranscribe.json();
  const text = transcriptionData.text;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 💾 Step 2: Save transcript to DB
  const savedTranscript = await prisma.transcript.create({
    data: {
      userId: user.id,
      text,
    },
  });

  // 🧠 Step 3: Generate summary with OpenAI
  const summaryPrompt = `
  Summarize the following transcript into clear, concise bullet point notes.
  Focus on main ideas, decisions, or any key points:

  "${text}"
  `;

  const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: summaryPrompt }],
    }),
  });

  const summaryData = await summaryRes.json();
  const summaryText =
    summaryData.choices?.[0]?.message?.content || "No summary generated.";

  // Extract title from summary text (first line or first few words)
  const summaryTitle =
    summaryText
      .split("\n")[0]
      .replace(/^[-\s]*/, "")
      .slice(0, 50) || "Untitled Summary";

  // 💾 Step 4: Save summary linked to transcript
  await prisma.summary.create({
    data: {
      transcriptId: savedTranscript.id,
      summaryText,
      summaryTitle,
    },
  });

  return NextResponse.json({
    text,
    summary: summaryText,
  });
}
