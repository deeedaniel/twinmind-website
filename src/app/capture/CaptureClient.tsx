"use client";

import { useRef, useState, useEffect } from "react";
import {
  Mic,
  CircleStop,
  Search,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const shouldStopRef = useRef(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Add streamRef at component level
  const streamRef = useRef<MediaStream | null>(null);

  // Add this with other refs at the component level
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // First, let's extract the fetch transcripts logic into a reusable function
  const fetchTranscripts = async () => {
    const res = await fetch("/api/transcript");
    const transcripts = await res.json();
    setData(transcripts);
    const groupedByDate = transcripts.reduce((acc: any, item: Transcript) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      acc[date] = acc[date] || [];
      acc[date].push(item);
      return acc;
    }, {});
    setGrouped(groupedByDate);
  };

  // Update the useEffect to use this function
  useEffect(() => {
    fetchTranscripts();
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
    // Clear any existing interval first
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    // Store stream reference
    streamRef.current = stream;

    audioChunksRef.current = [];
    shouldStopRef.current = false;

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
      setTranscript((prev) => prev + " " + data.text);
      setTranscriptText((prev) => prev + " " + data.text);

      // Only restart recording if we're not stopping
      if (!shouldStopRef.current) {
        // Clear previous chunk
        audioChunksRef.current = [];

        // Restart recording
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable =
          mediaRecorder.ondataavailable;
        mediaRecorderRef.current.onstop = mediaRecorder.onstop;
        mediaRecorderRef.current.start();
      }
    };

    if (shouldStopRef.current) {
      return;
    }

    // Start initial recording
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    // Auto-stop & restart every 30 seconds
    chunkIntervalRef.current = setInterval(() => {
      if (mediaRecorderRef.current && !shouldStopRef.current) {
        mediaRecorderRef.current.stop();
      }
    }, 30_000);
  };

  // Then update the stopRecording function to refetch after saving
  const stopRecording = async () => {
    shouldStopRef.current = true;

    // Clear the chunk interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop the media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);

    // Save transcript if there's any text
    if (transcriptText.trim()) {
      const res = await fetch("/api/save-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcriptText }),
      });

      const { transcriptId } = await res.json();

      // Generate summary
      await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });

      // Clear the transcript text
      setTranscript("");
      setTranscriptText("");

      // Refetch transcripts to update the list
      await fetchTranscripts();
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setSelected(null); // close modal
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="min-h-screen">
        {/* Tabs */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-white z-10 shadow-sm rounded-xl">
          <div className="max-w-4xl mx-auto px-2 py-2">
            <div className="flex justify-center space-x-20 text-lg">
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
                <div className="p-4 mb-24">
                  {Object.entries(grouped).map(([date, entries]) => (
                    <div key={date} className="mb-6 w-[600px]">
                      <h2 className="text-lg font-bold text-[#646464]">
                        {date}
                      </h2>
                      <div className="space-y-4 mt-2">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="cursor-pointer shadow-sm bg-white px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:translate-x-1"
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
                                {entry.summary?.summaryTitle ||
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
                      <div
                        ref={modalRef}
                        className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg flex flex-col gap-4"
                      >
                        <div>
                          <button
                            onClick={() => setSelected(null)}
                            className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
                          >
                            <ChevronLeft /> Back
                          </button>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold mb-2 text-[#0b4f75]">
                            {selected.summary?.summaryTitle ||
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
                            className={`px-4 py-1 rounded-full  cursor-pointer hover:bg-[#c5cfda] transition-all duration-300 hover:text-[#0b4f75] ${
                              modalTab === "summary"
                                ? "bg-[#c5cfda] text-[#0b4f75] font-semibold"
                                : "bg-[#eeeeee] text-[#656565]"
                            }`}
                          >
                            Summary
                          </button>
                          <button
                            onClick={() => setModalTab("transcript")}
                            className={`px-4 py-1 rounded-full cursor-pointer hover:bg-[#c5cfda] transition-all duration-300 hover:text-[#0b4f75] ${
                              modalTab === "transcript"
                                ? "bg-[#c5cfda] text-[#0b4f75] font-semibold"
                                : "bg-[#eeeeee] text-[#656565]"
                            }`}
                          >
                            Transcript
                          </button>
                        </div>

                        <div className="max-h-100 overflow-y-auto pr-2">
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
                <div className="p-4 mb-24">
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
                        <div className="space-y-4 mt-2">
                          {events.map((event) => {
                            const start =
                              event.start?.dateTime || event.start?.date;
                            const parsed = new Date(start || "");
                            return (
                              <div
                                key={event.id}
                                className="shadow-sm bg-white px-4 py-2 rounded-lg flex gap-6 items-center hover:bg-gray-100 transition-all duration-300"
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
              <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[500px] bg-white rounded-xl shadow-lg p-4 border-1 border-[#c8d1dd]">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[#0b4f75]">Live Transcript:</p>
                  <button
                    onClick={() => setShowFullTranscript((prev) => !prev)}
                    className="text-sm text-[#0b4f75] hover:underline focus:outline-none"
                  >
                    {showFullTranscript ? (
                      <div className="flex items-center gap-2 cursor-pointer">
                        Minimize <ChevronDown />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer">
                        Expand <ChevronUp />
                      </div>
                    )}
                  </button>
                </div>
                <div
                  className={`${
                    showFullTranscript ? "max-h-60 mt-2" : "max-h-0"
                  } overflow-y-auto pr-1 transition-all duration-300`}
                >
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {transcript}
                  </p>
                </div>
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
                  className="flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-full px-4 py-2 gap-4 font-semibold shadow-md cursor-pointer hover:scale-105 transition-all duration-300"
                >
                  <CircleStop /> Stop
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className=" flex items-center justify-center bg-gradient-to-b from-[#1f587c] to-[#527a92] text-white rounded-full px-4 py-2 gap-4 font-semibold hover:scale-105 transition-all duration-300 shadow-md cursor-pointer"
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
