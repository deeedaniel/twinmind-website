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
  MessageCircleMore,
  Circle,
  Trash,
} from "lucide-react";
import { format } from "date-fns";
import AnimatedEllipsis from "../components/AnimatedEllipsis";
import { usePrivateMode } from "../context/PrivateModeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Transcript = {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  duration?: number;
  summaryNotes?: string;
  summary?: {
    id: string;
    summaryText: string;
    summaryTitle: string;
    summaryNotes: string;
  };

  // Local storage (private mode)
  summaryTitle?: string;
  summaryText?: string;
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  // const [summaries, setSummaries] = useState<Summary[]>([]);
  const [data, setData] = useState<Transcript[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Transcript[]>>({}); // grouping memories by date
  const [selected, setSelected] = useState<Transcript | null>(null); // selected memory
  const [modalTab, setModalTab] = useState<"summary" | "transcript" | "notes">(
    "summary"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAIAnswer, setShowAIAnswer] = useState(false);
  const finalTranscriptRef = useRef<string>(""); // NEW
  const memoryCreatedAtRef = useRef<Date | null>(null);

  // Questions
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState<
    Record<string, any[]>
  >({});
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Live Memory Modal
  const [liveMemoryOpen, setLiveMemoryOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const customTitleRef = useRef("");
  const customNotesRef = useRef("");
  const [memoryCreatedAt, setMemoryCreatedAt] = useState<Date | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [seconds, setSeconds] = useState(0);
  const durationRef = useRef(0);
  const [timerActive, setTimerActive] = useState(false);

  // Chat for live memory modal
  const [chatQuery, setChatQuery] = useState("");
  const [chatResult, setChatResult] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatAnswer, setShowChatAnswer] = useState(false);

  const [transcriptsLoading, setTranscriptsLoading] = useState(false);

  const shouldStopRef = useRef(false); // Should stop ref for audio recording
  const modalRef = useRef<HTMLDivElement>(null); // Memory modal ref
  const questionModalRef = useRef<HTMLDivElement>(null); // Question modal ref
  const liveMemoryRef = useRef<HTMLDivElement>(null); // Live memory modal ref
  const streamRef = useRef<MediaStream | null>(null); // Stream ref for audio recording
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval ref for audio recording

  const [editableSummary, setEditableSummary] = useState(summary);
  let checkboxIndex = 0;

  const { privateMode } = usePrivateMode();

  useEffect(() => {
    if (selected) {
      const summaryText =
        selected.summary?.summaryText || selected.summaryText || "";
      setEditableSummary(summaryText);
    }
  }, [selected]);

  // Fetch transcripts and questions right away
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchTranscripts();
      await fetchQuestions();
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Fetching calendar events whenever user clicks on calendar tab
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

  // React context for global private mode
  useEffect(() => {
    console.log("clientcapture private mode changed to:", privateMode);
    // now you can react to it or use it in conditionals
  }, [privateMode]);

  // Close memory modal when clicking outside
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

  // Close live memory modal when clicking outside
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

  // Close question modal when clicking outside
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

  // Automatically scroll to updated portion of transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcript]);

  // Timer for live memory
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newVal = prev + 1;
          durationRef.current = newVal; // keep duration in sync
          return newVal;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerActive]);

  // Fetching transcripts
  const fetchTranscripts = async () => {
    setTranscriptsLoading(true);

    try {
      // 1. Always get private (local) memories
      const local = JSON.parse(localStorage.getItem("privateMemories") || "[]");

      let combined: Transcript[] = [...local];

      const res = await fetch("/api/transcript");
      const serverData = await res.json();
      combined = [...local, ...serverData];

      combined.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 4. Group by date
      const groupedByDate = combined.reduce((acc: any, item: Transcript) => {
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
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    } finally {
      setTranscriptsLoading(false);
    }
  };

  // Fetching questions
  const fetchQuestions = async () => {
    setLoadingQuestions(true);

    try {
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
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Grouping events by date
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

  // Start recording function
  const startRecording = async () => {
    // Clear any existing interval first
    memoryCreatedAtRef.current = new Date();

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

      audioChunksRef.current = [];

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

      const date = new Date();
      const timeStamp = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let num = 1;
      console.log("Full text" + num + ": " + fullText);
      num = num + 1;

      if (!shouldStopRef.current) {
        finalTranscriptRef.current +=
          timeStamp +
          "\n" +
          fullText +
          "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        setTranscript((prev) =>
          prev
            ? prev +
              timeStamp +
              "\n" +
              fullText +
              "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            : timeStamp +
              "\n" +
              fullText +
              "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        );
        console.log("1: " + timeStamp);
      } else {
        finalTranscriptRef.current += timeStamp + "\n" + fullText;
        setTranscript((prev) => prev + timeStamp + "\n" + fullText);
        console.log("2: " + timeStamp);
      }

      // ✅ Only save once if this was the final stop
      if (shouldStopRef.current && finalTranscriptRef.current.trim()) {
        const cleanText = finalTranscriptRef.current.trim();

        let transcriptId: string | undefined;

        if (!privateMode) {
          const saveRes = await fetch("/api/save-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cleanText,
              createdAt: memoryCreatedAtRef.current?.toISOString(),
              duration: durationRef.current,
            }),
          });
          const res = await saveRes.json();
          transcriptId = res.transcriptId;
        }

        const summaryRes = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptId: transcriptId ?? undefined,
            title: customTitleRef.current.trim(),
            notes: customNotesRef.current.trim(),
            text: cleanText,
          }),
        });

        const { summaryTitle, summaryText } = await summaryRes.json();
        setSummaryTitle(summaryTitle);
        setSummary(summaryText);

        // Save to local storage if private mode
        if (privateMode) {
          const stored = JSON.parse(
            localStorage.getItem("privateMemories") || "[]"
          );

          stored.push({
            id: crypto.randomUUID(),
            text: cleanText,
            createdAt: new Date().toISOString(),
            duration: durationRef.current,
            summaryTitle: summaryTitle + " (Private)",
            summaryText: summaryText,
            summaryNotes: customNotesRef.current.trim(),
          });

          localStorage.setItem("privateMemories", JSON.stringify(stored));
        }
        await fetchTranscripts();
      }

      // Restart recorder if not stopping
      if (!shouldStopRef.current) {
        // audioChunksRef.current = []; // Clear right away
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

  // Search function for asking all memories
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;
    console.log("Searching...");

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

      await fetchQuestions();
    } catch (err) {
      console.error("Error searching:", err);
      setSearchResult("Something went wrong. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Chat function for asking live memory
  const handleChat = async (transcriptToUse: string) => {
    if (!chatQuery.trim() || chatLoading) return;

    setChatLoading(true);
    setShowChatAnswer(true);
    setChatResult("");
    console.log("Chatting...");

    try {
      const res = await fetch("/api/ask-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: chatQuery,
          transcript: transcriptToUse || transcript,
        }),
      });

      const data = await res.json();

      setChatResult(data.answer);

      await fetchQuestions();
    } catch (err) {
      console.error("Error chatting:", err);
      setChatResult("Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  // Formatting seconds into minute:seconds
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const secsLeft = (secs % 60).toString().padStart(2, "0");
    return `${mins}:${secsLeft}`;
  };

  const isMarkdown = (text: string): boolean => {
    return /[-*]\s|[0-9]+\.\s|\*\*|`|#{1,6}\s|_\w+_/.test(text);
  };

  const handleCheckboxToggle = (index: number) => {
    const lines = editableSummary.split("\n");
    let checkboxCount = -1;

    const updated = lines.map((line) => {
      if (line.match(/^\s*[-*] \[[ xX]\]/)) {
        checkboxCount++;
        if (checkboxCount === index) {
          return line.includes("[x]") || line.includes("[X]")
            ? line.replace("[x]", "[ ]").replace("[X]", "[ ]")
            : line.replace("[ ]", "[x]");
        }
      }
      return line;
    });

    const newSummary = updated.join("\n");
    setEditableSummary(newSummary);

    // OPTIONAL: Send update to DB
    fetch("/api/update-summary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: newSummary }),
    });
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Tabs */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-white z-10 shadow-md rounded-xl">
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
                  {isLoading ? (
                    <p>
                      Fetching memories
                      <AnimatedEllipsis />
                    </p>
                  ) : (
                    <>
                      {Object.entries(grouped).map(([date, entries]) => (
                        <div
                          key={date}
                          className="mb-6 md:w-[600px] w-[300px] max-w-[100vw]"
                        >
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
                                      {format(
                                        new Date(entry.createdAt),
                                        "h:mm"
                                      )}
                                    </span>
                                    <span className="text-sm text-gray-500 uppercase">
                                      {format(new Date(entry.createdAt), "aaa")}
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-800 truncate">
                                    {entry.summary?.summaryTitle ||
                                      entry.summaryTitle ||
                                      "Untitled"}
                                  </span>
                                  <span className="text-gray-500 ml-auto">
                                    {Math.floor((entry.duration ?? 0) / 60)}m
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Memory Page Modal */}
                  {selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                      <div ref={modalRef}>
                        <div className="bg-white w-[600px] max-w-[100vw] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setSelected(null)}
                              className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
                            >
                              <ChevronLeft /> Back
                            </button>
                            <div className="flex items-center justify-center bg-[#f3f3f3] text-[#646464] rounded-xl p-2 px-3 gap-2 text-sm sm:text-base font-semibold shadow-sm  transition-all duration-300">
                              <Circle size={15} className="fill-[#646464]" />
                              <p className="w-12">
                                {formatTime(selected.duration ?? 0)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xl font-bold mb-2 text-[#0b4f75]">
                              {selected.summary?.summaryTitle ||
                                selected.summaryTitle ||
                                "Untitled"}
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
                          <div className="flex mb-2 ">
                            <div className="flex space-x-4 ">
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
                                className={`px-4 py-1 rounded-full  cursor-pointer hover:bg-[#c5cfda] transition-all duration-300 hover:text-[#0b4f75] ${
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

                            <button
                              onClick={async () => {
                                if (!selected) return;

                                const confirmed = window.confirm(
                                  "Are you sure you want to delete this memory?"
                                );
                                if (!confirmed) return;

                                const res = await fetch("/api/delete-memory", {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ id: selected.id }),
                                });

                                if (res.ok) {
                                  // Refetch transcripts
                                  await fetchTranscripts();
                                  setSelected(null); // Close modal
                                } else {
                                  const { error } = await res.json();
                                  alert("Failed to delete: " + error);
                                }
                              }}
                              className={
                                "p-1 px-2 rounded-lg cursor-pointer  transition-all duration-300 text-red-500 ml-auto items-center justify-center flex gap-2 hover:bg-red-100"
                              }
                            >
                              <Trash size={20} />
                              <p className="md:block hidden">Delete</p>
                            </button>
                          </div>

                          <div className="max-h-100 overflow-y-auto pr-2">
                            {modalTab === "summary" ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  li: ({ node, children }) => {
                                    const typedNode = node as any;

                                    if (
                                      typeof typedNode.checked === "boolean"
                                    ) {
                                      const currentIndex = checkboxIndex;
                                      const checked = typedNode.checked;
                                      checkboxIndex++;

                                      return (
                                        <li className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                              handleCheckboxToggle(currentIndex)
                                            }
                                          />
                                          <span>{children}</span>
                                        </li>
                                      );
                                    }

                                    return <li>{children}</li>;
                                  },
                                }}
                              >
                                {editableSummary}
                              </ReactMarkdown>
                            ) : modalTab === "notes" ? (
                              <p className="text-gray-800 whitespace-pre-wrap overflow-x-hidden">
                                {selected.summary?.summaryNotes ||
                                  selected.summaryNotes ||
                                  "No notes available."}
                              </p>
                            ) : (
                              <p className="text-gray-800 whitespace-pre-wrap overflow-x-hidden">
                                {selected.text}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-16 md:px-0 scale-110 md:scale-100">
                          <div className="relative w-full">
                            <input
                              type="text"
                              value={chatQuery}
                              onChange={(e) => setChatQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleChat(selected.text);
                                  setChatQuery("");
                                }
                              }}
                              placeholder="Chat with Transcript"
                              className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-3 py-2 font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
                            />
                            <button
                              onClick={() => {
                                handleChat(selected.text);
                                setChatQuery("");
                              }}
                            >
                              <MessageCircleMore
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0b4f75] cursor-pointer"
                                size={20}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-4 w-full max-w-md px-4 z-10">
                          {chatLoading && (
                            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] translate-y-4 md:translate-y-0">
                              <div className="flex justify-between items-center">
                                <p className="font-bold text-sm sm:text-base text-[#0b4f75]">
                                  TwinMind Answer:
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setShowChatAnswer((prev) => !prev)
                                    }
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
                                  Thinking
                                  <AnimatedEllipsis />
                                </p>
                              </div>
                            </div>
                          )}
                          {chatResult && !chatLoading && (
                            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] translate-y-4 md:translate-y-0">
                              <div className="flex justify-between items-center">
                                <p className="font-bold text-sm sm:text-base text-[#0b4f75]">
                                  TwinMind Answer:
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setShowChatAnswer((prev) => !prev)
                                    }
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
                  {isCalendarLoading && (
                    <p>
                      Fetching calendar events
                      <AnimatedEllipsis />
                    </p>
                  )}
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
                  {isLoading ? (
                    <p>
                      Fetching questions
                      <AnimatedEllipsis />
                    </p>
                  ) : questions.length === 0 ? (
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
            {/* Question modal */}
            {selectedQuestion && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                <div
                  className="bg-white w-[600px] max-w-[100vw] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
                  ref={questionModalRef}
                >
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="text-[#4386a6] hover:underline cursor-pointer flex items-center gap-2 transition-all duration-300 hover:translate-x-1"
                  >
                    <ChevronLeft /> Back
                  </button>

                  <p className="text-lg md:text-2xl text-gray-800 whitespace-pre-wrap mt-2 font-bold flex items-center">
                    {selectedQuestion.query}
                    <button
                      onClick={async () => {
                        if (!selectedQuestion) return;

                        const confirmed = window.confirm(
                          "Are you sure you want to delete this question?"
                        );
                        if (!confirmed) return;

                        const res = await fetch("/api/delete-question", {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ id: selectedQuestion.id }),
                        });

                        if (res.ok) {
                          // Refetch transcripts
                          await fetchQuestions();
                          setSelectedQuestion(null); // Close modal
                        } else {
                          const { error } = await res.json();
                          alert("Failed to delete: " + error);
                        }
                      }}
                      className={
                        "p-1 px-2 rounded-lg cursor-pointer  transition-all duration-300 text-red-500 ml-auto items-center justify-center flex gap-2 hover:bg-red-100 font-normal text-base"
                      }
                    >
                      <Trash size={20} />
                      <p className="md:block hidden">Delete</p>
                    </button>
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
                <p className="text-[#757575] font-semibold truncate ml-auto bg-[#ffffff] rounded-xl px-3 py-1 flex items-center gap-1">
                  <Circle
                    size={14}
                    className="fill-[#ff6c71] stroke-[#ff6c71]"
                  />
                  <p className="w-11">{formatTime(seconds)}</p>
                </p>
              </div>
            )}
            {/* Bottom controls */}
            <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-16 md:px-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 scale-110 md:scale-100">
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
                    className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-3 py-2 font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
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
                      setMemoryCreatedAt(new Date());
                      setTranscript("");
                      // setIsRecording(true);
                      setLiveMemoryOpen(true);
                      setCustomTitle("");
                      setCustomNotes("");
                      customTitleRef.current = "";
                      customNotesRef.current = "";
                      finalTranscriptRef.current = "";
                      setSummary("");
                      setSummaryTitle("");
                      setChatResult("");
                      setShowAIAnswer(false);
                      setTimerActive(true);
                      startRecording();
                      setSeconds(0);
                    }}
                    className="flex items-center justify-center bg-gradient-to-b from-[#1f587c] to-[#527a92] text-white rounded-full px-3 py-2 gap-2 font-semibold hover:scale-105 transition-all duration-300 shadow-md cursor-pointer"
                  >
                    <Mic size={18} /> Capture
                  </button>
                )}
              </div>
            </div>
            {/* Live Memory Modal */}
            {liveMemoryOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                <div ref={liveMemoryRef}>
                  <div className="bg-white w-[600px] max-w-[100vw] p-6 rounded-xl shadow-lg flex flex-col gap-4 max-h-[60vh]">
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
                            setTimerActive(false);
                          }}
                          className="flex items-center justify-center bg-[#ffe7e8] text-[#ff585d] rounded-xl p-2 px-3 gap-2 text-sm sm:text-base font-semibold shadow-sm cursor-pointer hover:scale-105 transition-all duration-300"
                        >
                          <CircleStop size={25} />
                          <p className="w-12">{formatTime(seconds)}</p>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center bg-[#f3f3f3] text-[#646464] rounded-xl p-2 px-3 gap-2 text-sm sm:text-base font-semibold shadow-sm  transition-all duration-300">
                          <Circle size={15} className="fill-[#646464]" />
                          <p className="w-12">{formatTime(seconds)}</p>
                        </div>
                      )}
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
                        {memoryCreatedAt
                          ? format(memoryCreatedAt, "MMM d, yyyy '·' h:mm aaa")
                          : format(new Date(), "MMM d, yyyy '·' h:mm aaa")}
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

                    <div
                      className="max-h-100 pr-2 overflow-y-auto"
                      ref={transcriptRef}
                    >
                      {modalTab === "summary" ? (
                        summary ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc list-inside ml-2"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal list-inside ml-2"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="" {...props} />
                              ),
                            }}
                          >
                            {summary}
                          </ReactMarkdown>
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
                        <div className="text-gray-800 whitespace-pre-wrap overflow-x-hidden">
                          {transcript}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-16 md:px-0 scale-110 md:scale-100">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChat(transcript);
                            setChatQuery("");
                          }
                        }}
                        placeholder="Chat with Transcript"
                        className="w-full pr-10 bg-[#e8edee] text-[#0b4f75] rounded-full px-3 py-2 font-semibold shadow-md border-2 border-[#c8d1dd] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0b4f75]"
                      />
                      <button
                        onClick={() => {
                          handleChat(transcript);
                          setChatQuery("");
                        }}
                      >
                        <MessageCircleMore
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0b4f75] cursor-pointer"
                          size={20}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col gap-4 w-full max-w-md px-4 z-10">
                    {chatLoading && (
                      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] translate-y-4 md:translate-y-0">
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
                            Thinking
                            <AnimatedEllipsis />
                          </p>
                        </div>
                      </div>
                    )}
                    {chatResult && !chatLoading && (
                      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] translate-y-4 md:translate-y-0">
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
              {searchLoading && (
                <div
                  className={`bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] ${
                    isRecording
                      ? "-translate-y-28 md:-translate-y-12"
                      : "-translate-y-12 md:-translate-y-0"
                  }`}
                >
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
                      Thinking
                      <AnimatedEllipsis />
                    </p>
                  </div>
                </div>
              )}
              {searchResult && !searchLoading && (
                <div
                  className={`bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-[#c8d1dd] ${
                    isRecording
                      ? "-translate-y-28 md:-translate-y-12"
                      : "-translate-y-12 md:-translate-y-0"
                  }`}
                >
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
