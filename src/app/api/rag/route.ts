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
  });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

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
    user.id,
    queryEmbedding
  );

  const context = results.map((r: any) => r.text).join("\n\n");

  // 3. Send to OpenAI for final generation
  const prompt = `
You are an AI assistant that answers user questions based on their past transcripts.

Relevant transcripts:
${context}

User question: "${query}"
Answer:
`;

  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const gptData = await gptRes.json();
  const answer =
    gptData.choices?.[0]?.message?.content ||
    "Sorry, I couldn't find an answer.";

  return NextResponse.json({ answer });
}
