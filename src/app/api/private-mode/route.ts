import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { privateMode } = await req.json();

  try {
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { privateMode },
    });
    console.log("updatedUser", updatedUser);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { privateMode: true },
  });

  return NextResponse.json(user);
}
