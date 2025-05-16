"use client";

import { useRef, useState, useEffect } from "react";
import {
  Mic,
  CircleStop,
  Search,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { format } from "date-fns";
import AnimatedEllipsis from "../components/AnimatedEllipsis";

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
  // const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  // const [summaries, setSummaries] = useState<Summary[]>([]);
  const [data, setData] = useState<Transcript[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Transcript[]>>({});
  const [selected, setSelected] = useState<Transcript | null>(null);
  const [modalTab, setModalTab] = useState<"summary" | "transcript" | "notes">(
    "summary"
  );
  const [showFullTranscript, setShowFullTranscript] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAIAnswer, setShowAIAnswer] = useState(false);
  const [personalization, setPersonalization] = useState("");
  const finalTranscriptRef = useRef<string>(""); // NEW

  // Questions
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState<
    Record<string, any[]>
  >({});
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);

  // Live Memory Page
  const [liveMemoryOpen, setLiveMemoryOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const customTitleRef = useRef("");
  const customNotesRef = useRef("");

  const [summary, setSummary] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");

  const [chatQuery, setChatQuery] = useState("");
  const [chatResult, setChatResult] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatAnswer, setShowChatAnswer] = useState(false);

  useEffect(() => {
    // Dynamically load the polyfill on client-side only
    const loadPolyfill = async () => {
      if (
        typeof window !== "undefined" &&
        typeof window.MediaRecorder === "undefined"
      ) {
        const { default: AudioRecorderPolyfill } = await import(
          "audio-recorder-polyfill"
        );
        window.MediaRecorder = AudioRecorderPolyfill;
      }
    };
    loadPolyfill();
  }, []);

  const fetchQuestions = async () => {
    console.log("Sending to summary:", {
      title: customTitle,
      notes: customNotes,
    });

    const res = await fetch("/api/question");
    const data = await res.json();
    setQuestions(data);

    // Group by date
    const groupedByDate = data.reduce((acc: any, item: any) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      acc[date] = acc[date] || [];
      acc[date].push(item);
      return acc;
    }, {});

    setGroupedQuestions(groupedByDate);
  };

  useEffect(() => {
    if (activeTab === "questions") {
      fetchQuestions();
    }
  }, [activeTab]);

  const shouldStopRef = useRef(false);

  // This is for when user clicks out of modals to exit it
  const modalRef = useRef<HTMLDivElement>(null);

  // This is for when user clicks out of question modals
  const questionModalRef = useRef<HTMLDivElement>(null);

  // This is for when user clicks out of live memory modal
  const liveMemoryRef = useRef<HTMLDivElement>(null);

  // Add streamRef at component level
  const streamRef = useRef<MediaStream | null>(null);

  // Add this with other refs at the component level
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

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

    setLiveMemoryOpen(true);
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
      // ✅ Reset everything, this makes is so transcript stays until a new recording starts

      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/wav",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      const res = await fetch("/api/transcribe-gemini", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const fullText = (data.text || "").trim();

      // finalTranscriptRef.current += " " + fullText; // ✅ accumulate full transcript

      // Condition to check if prev is not empty
      // Avoids blank space in the beginning for no reason
      // setTranscript((prev) => (prev ? prev + " " + fullText : fullText));

      if (!shouldStopRef.current) {
        finalTranscriptRef.current += " " + fullText;
        setTranscript((prev) => (prev ? prev + " " + fullText : fullText));
      } else {
        finalTranscriptRef.current = fullText;
        setTranscript((prev) => (prev ? " " + fullText : fullText));
      }

      // ✅ Only save once if this was the final stop
      if (shouldStopRef.current && finalTranscriptRef.current.trim()) {
        const cleanText = finalTranscriptRef.current.trim();

        await fetch("/api/save-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText }),
        });

        const saveRes = await fetch("/api/save-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText }),
        });

        const { transcriptId } = await saveRes.json();

        const summaryRes = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptId,
            title: customTitleRef.current.trim(),
            notes: customNotesRef.current.trim(),
          }),
        });

        const { summaryTitle, summaryText } = await summaryRes.json();
        setSummaryTitle(summaryTitle);
        setSummary(summaryText);

        await fetchTranscripts();
      }

      // Restart recorder if not stopping
      if (!shouldStopRef.current) {
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

    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setSelected(null); // close modal
        setModalTab("summary");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleClickOutsideLiveMemory(event: MouseEvent) {
      if (
        liveMemoryRef.current &&
        !liveMemoryRef.current.contains(event.target as Node)
      ) {
        setLiveMemoryOpen(false);
      }
    }

    if (liveMemoryOpen) {
      document.addEventListener("mousedown", handleClickOutsideLiveMemory);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideLiveMemory);
    };
  }, [liveMemoryOpen]);

  useEffect(() => {
    function handleClickOutsideQuestion(event: MouseEvent) {
      if (
        questionModalRef.current &&
        !questionModalRef.current.contains(event.target as Node)
      ) {
        setSelectedQuestion(null); // close the question modal
      }
    }

    if (selectedQuestion) {
      document.addEventListener("mousedown", handleClickOutsideQuestion);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideQuestion);
    };
  }, [selectedQuestion]);

  // Search function (Ask all Memories)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setShowAIAnswer(true);
    setSearchResult("");

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();

      console.log("RAG: ", data);

      setSearchResult(data.answer);

      await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, answer: data.answer }),
      });

      await fetchQuestions();
    } catch (err) {
      console.error("Error searching:", err);
      setSearchResult("Something went wrong. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatQuery.trim()) return;

    setChatLoading(true);
    setShowChatAnswer(true);
    setChatResult("");

    try {
      const res = await fetch("/api/ask-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatQuery, transcript: transcript }),
      });

      const data = await res.json();

      setChatResult(data.answer);

      await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, answer: data.answer }),
      });
    } catch (err) {
      console.error("Error chatting:", err);
      setChatResult("Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Tabs */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-white z-10 shadow-sm rounded-xl">
          <div className="w-[300px] md:w-[650px] mx-auto px-2 py-3 md:py-2">
            <div className="flex justify-center space-x-16 md:space-x-20 -translate-x-5 md:-translate-x-0">
              {["memories", "calendar", "questions"].map((tab) => (
                <button
                  key={tab}
                  className={`w-[20px] md:w-[150px] transition-all text-sm md:text-lg ${
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
                    <div key={date} className="mb-6 md:w-[600px] w-[300px]">
                      <h2 className="text-lg font-bold text-[#646464]">
                        {date}
                      </h2>
                      <div className="space-y-4 mt-2">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="cursor-pointer shadow-sm bg-white px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:translate-x-1"
                            onClick={() => {
                              setSelected(entry);
                              setModalTab("summary");
                            }}
                          >
                            <div className="flex gap-6 items-center">
                              <div className="flex flex-col items-center w-8">
                                <span className="text-sm text-gray-500">
                                  {format(new Date(entry.createdAt), "h:mm")}
                                </span>
                                <span className="text-sm text-gray-500 uppercase">
                                  {format(new Date(entry.createdAt), "aaa")}
                                </span>
                              </div>
                              <span className="font-medium text-gray-800 truncate">
                                {entry.summary?.summaryTitle || "Untitled"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Memory Page Modal */}
                  {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                      <div
                        ref={modalRef}
                        className="bg-white w-[600px] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
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
                            {selected.summary?.summaryTitle || "Untitled"}
                          </h3>
                          <p className="text-sm text-[#909090] mb-4 font-semibold">
                            {format(
                              new Date(selected.createdAt),
                              "MMM d, yyyy '·' h:mm"
                            )}
                            <span className="text-sm text-[#909090] uppercase">
                              {format(new Date(selected.createdAt), "aaa")}
                            </span>
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
                            Notes
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
                      <div key={date} className="mb-6 md:w-[600px] w-[300px]">
                        <h2 className="text-lg font-bold text-[#646464]">
                          {date}
                        </h2>
                        <div className="space-y-4 mt-2">
                          {(events as CalendarEvent[]).map((event) => {
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
                                      {format(parsed, "h:mm")}
                                    </span>
                                    <span className="text-sm text-gray-500 uppercase">
                                      {format(parsed, "aaa")}
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

              {/* Questions tab */}

              {activeTab === "questions" && (
                <div className="p-4 mb-24">
                  {questions.length === 0 ? (
                    <p>No questions yet.</p>
                  ) : (
                    <ul className="space-y-4 max-w-[600px]">
                      <div className="mb-24">
                        {Object.keys(groupedQuestions).length === 0 ? (
                          <p>No questions yet.</p>
                        ) : (
                          Object.entries(groupedQuestions).map(
                            ([date, entries]) => (
                              <div
                                key={date}
                                className="mb-6 md:w-[600px] w-[300px]"
                              >
                                <h2 className="text-lg font-bold text-[#646464]">
                                  {date}
                                </h2>
                                <div className="space-y-4 mt-2">
                                  {entries.map((q) => (
                                    <div
                                      key={q.id}
                                      className="bg-white rounded-xl p-4 shadow hover:bg-gray-100 transition-all duration-300 cursor-pointer hover:translate-x-1"
                                      onClick={() => setSelectedQuestion(q)}
                                    >
                                      <div className="flex items-center gap-4">
                                        <Search
                                          size={35}
                                          className="text-[#757575] bg-[#cedae8] rounded-full p-2 flex-shrink-0"
                                        />
                                        <div className="flex flex-col overflow-hidden">
                                          <p className="text-md font-semibold text-gray-700 truncate">
                                            {q.query}
                                          </p>
                                          <p className="text-sm mt-1 text-gray-500 truncate">
                                            {q.answer}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </ul>
                  )}
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
            {selectedQuestion && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                <div
                  className="bg-white w-[600px] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
                  ref={questionModalRef}
                >
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
                  >
                    <ChevronLeft /> Back
                  </button>

                  <p className="text-lg md:text-2xl text-gray-800 whitespace-pre-wrap mt-2 font-bold">
                    {selectedQuestion.query}
                  </p>

                  <div>
                    <h3 className="text-md font-bold text-[#0b4f75]">
                      Response:
                    </h3>
                    <p className="text-md text-gray-800 whitespace-pre-wrap mt-2">
                      {selectedQuestion.answer}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    {new Date(selectedQuestion.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {/* Live memory button (opens memory tab) */}
            {isRecording && (
              <div
                className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#1f587c] to-[#527a92] rounded-xl p-2 flex items-center gap-4 cursor-pointer w-[80vw] md:w-[450px] hover:scale-105 transition-all duration-300 md:mb-0 mb-14"
                onClick={() => setLiveMemoryOpen(true)}
              >
                <div className="flex flex-col items-center w-8">
                  <span className="text-sm text-white">
                    {format(new Date(), "h:mm")}
                  </span>
                  <span className="text-sm text-white uppercase">
                    {format(new Date(), "aaa")}
                  </span>
                </div>
                <p className="text-white  font-semibold truncate">
                  {customTitle || summaryTitle || "Untitled"}
                </p>
              </div>
            )}
            {/* Bottom controls */}
            <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-16 md:px-0 scale-125 md:scale-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ask All Memories button */}
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                        setSearchQuery("");
                      }
                    }}
                    placeholder="Ask All Memories"
                    className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-3 py-2 text-sm sm:text-base font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
                  />
                  <button
                    onClick={() => {
                      handleSearch();
                      setSearchQuery("");
                    }}
                  >
                    <Search
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0b4f75] cursor-pointer"
                      size={18}
                    />
                  </button>
                </div>

                {/* Capture buttons */}
                {isRecording ? (
                  <button
                    onClick={() => {
                      stopRecording();
                    }}
                    className="flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-full px-3 py-2 gap-2 text-sm sm:text-base font-semibold shadow-md cursor-pointer hover:scale-105 transition-all duration-300"
                  >
                    <CircleStop size={18} /> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Later uncomment this and  remove setIsRecording(true)
                      startRecording();
                      // setIsRecording(true);
                      setLiveMemoryOpen(true);
                      setCustomTitle("");
                      setCustomNotes("");
                      customTitleRef.current = "";
                      customNotesRef.current = "";
                      finalTranscriptRef.current = "";
                      setTranscript("");
                      setSummary("");
                      setSummaryTitle("");
                      setChatResult("");
                      setShowAIAnswer(false);
                    }}
                    className="flex items-center justify-center bg-gradient-to-b from-[#1f587c] to-[#527a92] text-white rounded-full px-3 py-2 gap-2 text-sm sm:text-base font-semibold hover:scale-105 transition-all duration-300 shadow-md cursor-pointer"
                  >
                    <Mic size={18} /> Capture
                  </button>
                )}
              </div>
            </div>
            '{/* Live Memory Modal */}
            {liveMemoryOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                <div ref={liveMemoryRef}>
                  <div className="bg-white w-[600px] max-w-[100vw] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          setLiveMemoryOpen(false);
                          setModalTab("transcript");
                        }}
                        className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
                      >
                        <ChevronLeft /> Back
                      </button>
                      {isRecording ? (
                        <button
                          onClick={() => {
                            stopRecording();
                          }}
                          className="flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-full p-2 gap-2 text-sm sm:text-base font-semibold shadow-md cursor-pointer hover:scale-105 transition-all duration-300"
                        >
                          <CircleStop size={30} />
                        </button>
                      ) : null}
                    </div>
                    <div>
                      {summaryTitle && !customTitle ? (
                        <p className="text-xl font-bold mb-2 text-[#0b4f75] w-full">
                          {summaryTitle}
                        </p>
                      ) : (
                        <input
                          type="text"
                          className="text-xl font-bold mb-2 text-[#0b4f75] w-full"
                          placeholder="Untitled"
                          value={customTitle}
                          onChange={(e) => {
                            setCustomTitle(e.target.value);
                            customTitleRef.current = e.target.value;
                          }}
                        />
                      )}
                      <p className="text-sm text-[#909090] mb-4 font-semibold">
                        {format(new Date(), "MMM d, yyyy '·' h:mm aaa")}
                      </p>
                    </div>

                    <div className="flex mb-2 sm:space-x-4 md:translate-x-0 -translate-x-3 space-x-2">
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
                        onClick={() => setModalTab("notes")}
                        className={`px-4 py-1 rounded-full cursor-pointer hover:bg-[#c5cfda] transition-all duration-300 hover:text-[#0b4f75] ${
                          modalTab === "notes"
                            ? "bg-[#c5cfda] text-[#0b4f75] font-semibold"
                            : "bg-[#eeeeee] text-[#656565]"
                        }`}
                      >
                        Notes
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

                    <div className="max-h-100 overflow-y-auto pr-2 ">
                      {modalTab === "summary" ? (
                        summary ? (
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {summary}
                          </p>
                        ) : (
                          <p className="text-gray-800 whitespace-pre-wrap">
                            Transcribing in the background. When you stop the
                            summary will appear.
                          </p>
                        )
                      ) : modalTab === "notes" ? (
                        <textarea
                          className="text-gray-800 w-full rounded-lg p-2"
                          placeholder="A summary will appear when you stop recording. But you can write your own notes in the meantime!"
                          value={customNotes}
                          onChange={(e) => {
                            setCustomNotes(e.target.value);
                            customNotesRef.current = e.target.value;
                          }}
                        />
                      ) : (
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {transcript}
                        </p>
                      )}
                    </div>
                    <div ref={transcriptEndRef} />
                  </div>
                  <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-16 md:px-0 scale-125 md:scale-100">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChat();
                            setChatQuery("");
                          }
                        }}
                        placeholder="Chat with Transcript"
                        className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-3 py-2 text-sm sm:text-base font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
                      />
                      <button
                        onClick={() => {
                          handleChat();
                          setChatQuery("");
                        }}
                      >
                        <Search
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0b4f75] cursor-pointer"
                          size={18}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-4 w-full max-w-md px-4 z-10">
                    {chatResult && !chatLoading && (
                      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] mb-12 md:mb-0">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-sm sm:text-base text-[#0b4f75]">
                            TwinMind Answer:
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowChatAnswer((prev) => !prev)}
                              className="text-xs sm:text-sm text-[#0b4f75] hover:underline focus:outline-none"
                            >
                              {showChatAnswer ? (
                                <div className="flex items-center gap-1 cursor-pointer">
                                  Minimize <ChevronDown size={16} />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 cursor-pointer">
                                  Expand <ChevronUp size={16} />
                                </div>
                              )}
                            </button>
                            <button
                              onClick={() => setChatResult("")}
                              className="hover:bg-[#c8d1dd] rounded-full p-1 duration-200 transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div
                          className={`${
                            showChatAnswer
                              ? "max-h-40 sm:max-h-60 mt-2"
                              : "max-h-0"
                          } overflow-y-auto pr-1 transition-all duration-300`}
                        >
                          <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap">
                            {chatLoading ? (
                              <>
                                <AnimatedEllipsis />
                              </>
                            ) : (
                              chatResult
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* TwinMind ask all memories results */}
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-4 w-full max-w-md px-4 z-10">
              {searchResult && !searchLoading && (
                <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] mb-12 md:mb-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm sm:text-base text-[#0b4f75]">
                      TwinMind Answer:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAIAnswer((prev) => !prev)}
                        className="text-xs sm:text-sm text-[#0b4f75] hover:underline focus:outline-none"
                      >
                        {showAIAnswer ? (
                          <div className="flex items-center gap-1 cursor-pointer">
                            Minimize <ChevronDown size={16} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 cursor-pointer">
                            Expand <ChevronUp size={16} />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => setSearchResult("")}
                        className="hover:bg-[#c8d1dd] rounded-full p-1 duration-200 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`${
                      showAIAnswer ? "max-h-40 sm:max-h-60 mt-2" : "max-h-0"
                    } overflow-y-auto pr-1 transition-all duration-300`}
                  >
                    <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap">
                      {searchLoading ? (
                        <>
                          <AnimatedEllipsis />
                        </>
                      ) : (
                        searchResult
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
