import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query)
    return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { personalization: true, id: true },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = user.id as string;

  // 1. Embed user question
  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: query,
    }),
  });

  const embedJson = await embedRes.json();
  const queryEmbedding = embedJson.data[0].embedding;

  // 2. Query top 5 similar transcripts
  const results = await prisma.$queryRawUnsafe(
    `
    SELECT id, text
    FROM "Transcript"
    WHERE "userId" = $1 AND embedding IS NOT NULL
    ORDER BY embedding <#> ($2::vector)
    LIMIT 5
  `,
    userId,
    queryEmbedding
  );

  const transcripts = results as { id: string; text: string }[];

  // Log for debugging
  console.log(
    `Found ${transcripts.length} relevant transcripts for query: "${query}"`
  );

  if (transcripts.length === 0) {
    return NextResponse.json({
      answer:
        "I don't have any relevant information from your past transcripts to answer this question.",
    });
  }

  const context = transcripts.map((r) => r.text).join("\n\n");

  const personalization = user.personalization
    ? `About the user: ${user.personalization}`
    : "";

  // 3. Send to OpenAI for final generation
  const prompt = `
You are an AI assistant that answers questions. Base these answers on the user's past transcripts as much as possible. These transcripts can be from lectures, meetings, conversations, or even the user themselves.

ABOUT THE USER:
${personalization}

RELEVANT TRANSCRIPTS:
${context}

INSTRUCTIONS:
1. Answer to the best ability based on information in the transcripts above and profile information.
2. Do not explicity say you are basing your answer on the user's profile information.
3. Do not make up any information.
4. Be concise and direct in your answer.
5. If quoting from transcripts, indicate which part you're referencing.
6. It is okay if you don't know.

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
