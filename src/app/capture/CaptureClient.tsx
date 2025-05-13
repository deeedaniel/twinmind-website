"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, CircleStop, Search, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

type Transcript = {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  summary?: {
    id: string;
    summaryText: string;
    summaryTitle: string;
  };
};

type CalendarEvent = {
  id: string;
  summary: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
};

type Summary = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
};

export default function CaptureClient() {
  const [activeTab, setActiveTab] = useState("memories");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [data, setData] = useState<Transcript[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Transcript[]>>({});
  const [selected, setSelected] = useState<Transcript | null>(null);
  const [modalTab, setModalTab] = useState<"summary" | "transcript">("summary");

  // Calling api to fetching transcripts
  /*
  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/transcript");
        if (!res.ok) {
          throw new Error("Failed to fetch transcripts");
        }
        const data = await res.json();
        setTranscripts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscripts();
  }, []);
  */

  useEffect(() => {
    fetch("/api/transcript")
      .then((res) => res.json())
      .then((transcripts) => {
        setData(transcripts);
        const groupedByDate = transcripts.reduce(
          (acc: any, item: Transcript) => {
            const date = new Date(item.createdAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            acc[date] = acc[date] || [];
            acc[date].push(item);
            return acc;
          },
          {}
        );
        setGrouped(groupedByDate);
      });
  }, []);

  // Calling api to fetch calendar events
  useEffect(() => {
    if (activeTab === "calendar") {
      const fetchEvents = async () => {
        try {
          setIsCalendarLoading(true);
          setCalendarError(null);
          const res = await fetch("/api/calendar");
          if (!res.ok)
            throw new Error(
              "Failed to fetch calendar events. Please re-login!"
            );
          const data = await res.json();
          setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
          setCalendarError(
            err instanceof Error ? err.message : "Failed to load events"
          );
          setEvents([]);
        } finally {
          setIsCalendarLoading(false);
        }
      };
      fetchEvents();
    }
  }, [activeTab]);

  const groupedEvents = events.reduce((acc: any, event) => {
    const rawDate = event.start?.dateTime || event.start?.date;
    if (!rawDate) return acc;

    const date = new Date(rawDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    acc[date] = acc[date] || [];
    acc[date].push(event);
    return acc;
  }, {});

  // Calling api to fetch summaries
  /*
  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const res = await fetch("/api/transcript");
        const transcripts = await res.json();

        const summaries = transcripts
          .filter((t: Transcript) => t.summary)
          .map((t: Transcript) => ({
            id: t.summary!.id,
            text: t.summary!.summaryText,
            title: t.summary!.summaryTitle,
            createdAt: t.createdAt,
          }));

        setSummaries(summaries);
      } catch (err) {
        console.error("Error fetching summaries:", err);
      }
    };

    if (activeTab === "summaries") {
      fetchSummaries(); // only fetch when the tab is active
    }
  }, [activeTab]);
  */

  // Start recording function
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    audioChunksRef.current = [];

    // Every 30 seconds, stop and restart the recorder
    let chunkInterval: NodeJS.Timeout;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTranscript((prev) => prev + " " + data.text); // still shows in UI
      setTranscriptText((prev) => prev + " " + data.text); // NEW: accumulate for DB

      // Clear previous chunk
      audioChunksRef.current = [];

      // Restart recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = mediaRecorder.ondataavailable;
      mediaRecorderRef.current.onstop = mediaRecorder.onstop;
      mediaRecorderRef.current.start();
    };

    // Start initial recording
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    // Auto-stop & restart every 30 seconds
    chunkInterval = setInterval(() => {
      mediaRecorderRef.current?.stop();
    }, 30_000);

    // Stop interval when recording stops
    (mediaRecorderRef.current as any).cleanup = () =>
      clearInterval(chunkInterval);
  };

  // Stop recording function
  const stopRecording = async () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);

    if ((mediaRecorderRef.current as any)?.cleanup) {
      (mediaRecorderRef.current as any).cleanup();
    }

    if (transcriptText.trim()) {
      const res = await fetch("/api/save-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcriptText }),
      });

      const { transcriptId } = await res.json();

      // ✅ Generate summary now
      await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });
    }
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Tabs */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-white z-10 shadow-sm rounded-xl">
          <div className="max-w-4xl mx-auto px-2 py-2">
            <div className="flex justify-center space-x-20">
              {["memories", "calendar", "questions"].map((tab) => (
                <button
                  key={tab}
                  className={`w-[150px] transition-all${
                    activeTab === tab
                      ? "border-[#0b4f75] text-[#0b4f75] font-semibold cursor-pointer"
                      : "border-transparent text-gray-500 hover:text-[#0b4f75] cursor-pointer"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mapping content for each tab */}

        <div className="pt-28 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="">
              {/* Memories tab */}

              {activeTab === "memories" && (
                <div className="p-4">
                  {Object.entries(grouped).map(([date, entries]) => (
                    <div key={date} className="mb-6 w-[600px]">
                      <h2 className="text-lg font-bold text-[#646464]">
                        {date}
                      </h2>
                      <div className="space-y-2 mt-2">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="cursor-pointer shadow-sm bg-white px-4 py-2 rounded-lg hover:bg-gray-100"
                            onClick={() => setSelected(entry)}
                          >
                            <div className="flex gap-6 items-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm text-gray-500">
                                  {format(new Date(entry.createdAt), "h:mm")}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(entry.createdAt), "aaa")}
                                </span>
                              </div>
                              <span className="font-medium text-gray-800 truncate">
                                {entry.summary?.summaryText?.slice(0, 30) ||
                                  "Untitled Memory"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Modal */}
                  {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                      <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg flex flex-col gap-4">
                        <div className="text-right">
                          <button
                            onClick={() => setSelected(null)}
                            className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 "
                          >
                            <ChevronLeft /> Back
                          </button>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold mb-2 text-[#0b4f75]">
                            {selected.summary?.summaryText?.slice(0, 40) ||
                              "Untitled Memory"}
                          </h3>
                          <p className="text-sm text-[#909090] mb-4 font-semibold">
                            {format(
                              new Date(selected.createdAt),
                              "MMM d, yyyy '·' h:mmaaa"
                            )}
                          </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex mb-2 space-x-4">
                          <button
                            onClick={() => setModalTab("summary")}
                            className={`px-4 py-1 rounded-full ${
                              modalTab === "summary"
                                ? "bg-[#c5cfda] text-[#0b4f75] font-semibold"
                                : "bg-[#eeeeee] text-[#656565]"
                            }`}
                          >
                            Summary
                          </button>
                          <button
                            onClick={() => setModalTab("transcript")}
                            className={`px-4 py-1 rounded-full ${
                              modalTab === "transcript"
                                ? "bg-[#c5cfda] text-[#0b4f75] font-semibold"
                                : "bg-[#eeeeee] text-[#656565]"
                            }`}
                          >
                            Transcript
                          </button>
                        </div>

                        {modalTab === "summary" ? (
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {selected.summary?.summaryText ||
                              "No summary available."}
                          </p>
                        ) : (
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {selected.text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*
              {activeTab === "memories" && (
                <>
                  {isLoading && <p>Loading transcripts...</p>}
                  {error && <p className="text-red-500">{error}</p>}
                  {!isLoading && !error && (
                    <ul className="space-y-4">
                      {transcripts.map((t) => (
                        <li
                          key={t.id}
                          className="w-[600px] p-4 bg-white rounded-lg shadow"
                        >
                          <strong className="block text-sm text-gray-600">
                            {new Date(t.createdAt).toLocaleString()}:
                          </strong>
                          <p className="mt-2">{t.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              */}

              {/* Calendar tab */}
              {activeTab === "calendar" && (
                <div className="p-4">
                  {isCalendarLoading && <p>Loading calendar events...</p>}
                  {calendarError && (
                    <p className="text-red-500">{calendarError}</p>
                  )}
                  {!isCalendarLoading &&
                    !calendarError &&
                    Object.keys(groupedEvents).length === 0 && (
                      <p>No upcoming events</p>
                    )}
                  {!isCalendarLoading &&
                    !calendarError &&
                    Object.entries(groupedEvents).map(([date, events]) => (
                      <div key={date} className="mb-6 w-[600px]">
                        <h2 className="text-lg font-bold text-[#646464]">
                          {date}
                        </h2>
                        <div className="space-y-2 mt-2">
                          {events.map((event) => {
                            const start =
                              event.start?.dateTime || event.start?.date;
                            const parsed = new Date(start || "");
                            return (
                              <div
                                key={event.id}
                                className="shadow-sm bg-white px-4 py-2 rounded-lg flex gap-6 items-center"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800 truncate">
                                    {event.summary || "Untitled Event"}
                                  </span>
                                  <div>
                                    <span className="text-sm text-gray-500">
                                      {format(parsed, "h:mmaaa")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {/*
              {activeTab === "calendar" && (
                <div className="space-y-4">
                  {isCalendarLoading && <p>Loading calendar events...</p>}
                  {calendarError && (
                    <p className="text-red-500">{calendarError}</p>
                  )}
                  {!isCalendarLoading &&
                    !calendarError &&
                    events.length === 0 && <p>No upcoming events</p>}
                  {!isCalendarLoading &&
                    !calendarError &&
                    events.length > 0 &&
                    events.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 bg-white rounded-lg shadow"
                      >
                        <p className="font-bold">{event.summary}</p>
                        <p className="text-sm text-gray-500">
                          {event.start?.dateTime || event.start?.date
                            ? new Date(
                                event.start.dateTime || event.start.date!
                              ).toLocaleString()
                            : "No date specified"}
                        </p>
                      </div>
                    ))}
                </div>
              )}
                              */}

              {/* Summaries tab */}

              {activeTab === "questions" && (
                <div className="p-4">
                  <p className="text-lg font-bold text-[#0b4f75]">
                    Coming Soon!
                  </p>
                </div>
              )}

              {/* Previous inside of questions tab
                <ul>
                  {summaries.map((s) => (
                    <li
                      key={s.id}
                      className="p-4 bg-white rounded-lg shadow mb-4 w-[600px]"
                    >
                      <h3 className="text-lg font-semibold text-[#0b4f75] mb-2">
                        {s.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">{s.text}</p>
                    </li>
                  ))}
                </ul>
                */}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="fixed top-24 right-8 w-[300px] bg-white rounded-lg shadow-lg p-4">
                <p className="font-bold text-[#0b4f75] mb-2">Transcript:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            <div className="fixed bottom-14 left-1/2 -translate-x-1/2 gap-4 grid grid-cols-2">
              {/* Ask All Memories button */}
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Ask All Memories"
                  className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-4 py-2 font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
                />
                <button>
                  <Search
                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-[#0b4f75] cursor-pointer"
                    size={20}
                  />
                </button>
              </div>

              {/* Capture buttons */}
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-full px-4 py-2 gap-4 font-semibold shadow-md cursor-pointer hover:scale-110 transition-all duration-300"
                >
                  <CircleStop /> Stop
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className=" flex items-center justify-center bg-gradient-to-b from-[#1f587c] to-[#527a92] text-white rounded-full px-4 py-2 gap-4 font-semibold hover:scale-110 transition-all duration-300 shadow-md cursor-pointer"
                >
                  <Mic /> Capture
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
