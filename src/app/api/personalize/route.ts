import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: { personalization: text } as any,
    select: { personalization: true } as any,
  });

  return NextResponse.json({
    success: true,
    personalization: updated.personalization as any,
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { personalization: true } as any,
  });

  return NextResponse.json({ personalization: user?.personalization || "" });
}
