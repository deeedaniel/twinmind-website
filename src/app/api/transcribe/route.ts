import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // adjust path as needed

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

  const openaiRes = await fetch(
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

  const data = await openaiRes.json();
  const text = data.text;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const savedTranscript = await prisma.transcript.create({
    data: {
      userId: user.id,
      text,
    },
  });

  return NextResponse.json({ text: data.text });
}
