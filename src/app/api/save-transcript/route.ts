import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, createdAt, duration } = await req.json();
  if (!text)
    return NextResponse.json({ error: "Missing text" }, { status: 400 });

  console.log("save-transcript", text);
  console.log("🚀 [save-transcript] Received createdAt:", createdAt);
  console.log("🚀 [save-transcript] Converted Date:", new Date(createdAt));

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 1. Create transcript
  const newTranscript = await prisma.transcript.create({
    data: {
      userId: user.id,
      text,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      duration: duration ? duration : 0,
    },
  });

  console.log("save-transcript duration: ", duration);
  // 2. Generate embedding
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: createdAt + "\n" + text,
    }),
  });

  const embedJson = await embeddingRes.json();
  const embedding = embedJson.data[0].embedding;

  // 3. Store embedding manually using raw SQL
  await prisma.$executeRawUnsafe(
    `UPDATE "Transcript" SET embedding = $1 WHERE id = $2`,
    embedding,
    newTranscript.id
  );

  return NextResponse.json({ success: true, transcriptId: newTranscript.id });
}
