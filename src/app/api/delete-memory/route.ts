// app/api/transcript/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "Missing transcript ID" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure transcript belongs to the user
    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript || transcript.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized or not found" },
        { status: 403 }
      );
    }

    // Delete summary first (if exists)
    await prisma.summary.deleteMany({
      where: { transcriptId: id },
    });

    // Delete the transcript
    await prisma.transcript.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
