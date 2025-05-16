import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audioBlob = formData.get("audio");

  if (!audioBlob || !(audioBlob instanceof Blob)) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await audioBlob.arrayBuffer());

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or "gemini-1.5-flash"

    // Convert buffer to base64
    const audioBase64 = buffer.toString("base64");

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Generate a transcript of the speech. If there no words, return a single pair of quotes",
            },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: audioBase64,
              },
            },
          ],
        },
      ],
    });

    const result = await response.response;
    const text = result.text();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Gemini transcription error:", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
