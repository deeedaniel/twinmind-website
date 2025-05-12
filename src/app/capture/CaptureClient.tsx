"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, CircleStop } from "lucide-react";

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

  // Calling api to fetching transcripts
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

  // Calling api to fetch calendar events
  useEffect(() => {
    if (activeTab === "calendar") {
      const fetchEvents = async () => {
        try {
          setIsCalendarLoading(true);
          setCalendarError(null);
          const res = await fetch("/api/calendar");
          if (!res.ok) throw new Error("Failed to fetch calendar events");
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

  // Calling api to fetch summaries
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

  // Start recording function
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    audioChunksRef.current = [];

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
      setTranscript(data.text);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  // Stop recording function
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Tabs */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-white z-10 shadow-sm rounded-xl">
          <div className="max-w-4xl mx-auto px-2 py-2">
            <div className="flex justify-center space-x-20">
              {["memories", "calendar", "summaries"].map((tab) => (
                <button
                  key={tab}
                  className={`w-[150px] transition-all ${
                    activeTab === tab
                      ? "border-[#0b4f75] text-[#0b4f75] font-semibold"
                      : "border-transparent text-gray-500 hover:text-[#0b4f75]"
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
        <div className="pt-24 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="">
              {/* Memories tab */}
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

              {/* Calendar tab */}
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

              {/* Summaries tab */}
              {activeTab === "summaries" && (
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
              )}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="mt-4 w-[800px]">
                <p className="font-bold">Transcript:</p>
                <p>{transcript}</p>
              </div>
            )}

            {/* Capture buttons */}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="fixed bottom-14 left-1/2 -translate-x-1/2 flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-full px-4 py-2 gap-4 font-semibold"
              >
                <CircleStop /> Stop
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="fixed bottom-14 left-1/2 -translate-x-1/2 flex items-center justify-center bg-gradient-to-b from-[#1f587c] to-[#527a92] text-white rounded-full px-4 py-2 gap-4 font-semibold hover:scale-110 transition-all duration-300"
              >
                <Mic /> Capture
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
