import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Upsert a dummy user to ensure a write operation happens
    // This prevents databases like Supabase/Neon from going inactive
    const user = await prisma.user.upsert({
      where: { email: "keepalive@twinmind.app" },
      update: {
        name: `KeepAlive ${new Date().toISOString()}`,
      },
      create: {
        email: "keepalive@twinmind.app",
        name: `KeepAlive ${new Date().toISOString()}`,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Database keep-alive write successful",
    });
  } catch (error) {
    console.error("Keep-alive cron failed:", error);
    return NextResponse.json(
      { error: "Failed to execute keep-alive" },
      { status: 500 }
    );
  }
}
