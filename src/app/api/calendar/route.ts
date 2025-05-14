import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session:", session);

    if (!session?.accessToken) {
      console.log("No access token found in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current date in ISO format
    const now = new Date();
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(now.getDate() + 14); // Add 14 days

    const timeMin = now.toISOString();
    const timeMax = twoWeeksFromNow.toISOString();

    console.log(
      "Fetching calendar events with token:",
      session.accessToken.substring(0, 10) + "..."
    );
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Calendar API error:", {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
      });
      return NextResponse.json(
        { error: `Failed to fetch calendar events: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data.items || []);
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
