"use client";

import { useState } from "react";
import { Mic, CircleStop } from "lucide-react";
import Image from "next/image";

export default function Capture() {
  const [activeTab, setActiveTab] = useState("memories");
  const [isRecording, setIsRecording] = useState(false);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="flex space-x-20">
            {["memories", "calendar", "questions"].map((tab) => (
              <button
                key={tab}
                className={`w-[120px] transition-all ${
                  activeTab === tab
                    ? "border-[#0b4f75] text-[#0b4f75] font-semibold border-b-2"
                    : "border-transparent text-gray-500 hover:text-[#0b4f75]"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="">
            {activeTab === "memories" && <p>Memories.</p>}
            {activeTab === "calendar" && <p>Calendar.</p>}
            {activeTab === "questions" && <p>Questions.</p>}
          </div>
          {isRecording ? (
            <button onClick={() => setIsRecording(false)}>
              <CircleStop /> Capture
            </button>
          ) : (
            <button onClick={() => setIsRecording(true)}>
              <Mic /> Stop
            </button>
          )}
        </div>
      </div>
    </>
  );
}
