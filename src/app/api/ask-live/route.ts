import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, transcript } = await req.json();
  if (!query)
    return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { personalization: true, id: true },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = user.id as string;

  const personalization = user.personalization
    ? `About the user: ${user.personalization}`
    : "";

  // 3. Send to OpenAI for final generation
  const prompt = `
You are an AI assistant that answers questions. Base these answers on the user's transcript as much as possible.This transcript can be from  a lecture, a meeting, a conversation, or even the user themselves.

ABOUT THE USER:
${personalization}

RELEVANT TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Answer to the best ability based on information in the transcript above and profile information.
2. Do not explicity say you are basing your answer on the user's profile information.
3. Do not make up information.
4. Be concise and direct in your answer.
5. If quoting from transcript, indicate which part you're referencing.

USER QUESTION: ${query}
`;

  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more focused answers
    }),
  });

  const gptData = await gptRes.json();
  const answer =
    gptData.choices?.[0]?.message?.content ||
    "Sorry, I couldn't find an answer.";

  console.log("BACKENDRAG: ", answer);

  // Store the question and answer
  try {
    await prisma.question.create({
      data: {
        query,
        answer,
        userId: userId,
      },
    });
  } catch (error) {
    console.error("Failed to store question/answer:", error);
    // Continue anyway - don't fail the request if storage fails
  }

  return NextResponse.json({ answer });
}
