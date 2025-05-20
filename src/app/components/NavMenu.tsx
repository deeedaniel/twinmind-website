"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  SquareArrowRight,
  SquareArrowLeft,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Switch } from "@headlessui/react";
import { usePrivateMode } from "../context/PrivateModeContext";

type Personalization = {
  id: string;
  text: string;
};

export default function NavMenu() {
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [personalization, setPersonalization] = useState("");
  const [showManageModal, setShowManageModal] = useState(false);
  const [isLoadingPersonalization, setIsLoadingPersonalization] =
    useState(false);

  const personalizeRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);

  /* Close modals when clicking outside */

  useEffect(() => {
    const fetchPrivateMode = async () => {
      const res = await fetch("/api/private-mode");
      const data = await res.json();
      setPrivateMode(data.privateMode);
    };
    fetchPrivateMode();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        personalizeRef.current &&
        !personalizeRef.current.contains(event.target as Node)
      ) {
        setShowPersonalize(false); // close modal
      }
      if (
        manageRef.current &&
        !manageRef.current.contains(event.target as Node)
      ) {
        setShowManageModal(false); // close modal
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const togglePrivateMode = async () => {
    const res = await fetch("/api/private-mode", {
      method: "POST",
      body: JSON.stringify({ privateMode: !privateMode }),
    });
    if (res.ok) {
      setPrivateMode(!privateMode);
    } else {
      alert("Failed to toggle private mode.");
    }
  };

  return (
    <>
      {/* Sidebar toggle button */}
      <button
        className={`fixed top-4 left-4 z-50 bg-[#ff7500] text-white px-2 py-2 rounded-xl transition-all duration-300 hover:bg-[#faaa6b] shadow-md cursor-pointer ${
          isOpen ? "left-48" : "left-4"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <SquareArrowLeft /> : <SquareArrowRight />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] text-white p-6 transition-transform duration-300 z-40 rounded-r-3xl shadow-lg overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Content container */}
        <div className="flex flex-col h-full justify-between space-y-6">
          {/* Logo */}
          <a
            href="https://twinmind.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/twinmind.png"
              alt="TwinMind Logo"
              width={150}
              height={150}
              className="mx-auto md:translate-y-10 translate-y-0"
            />
          </a>

          {/* Profile */}
          {session?.user && (
            <div className="flex items-center gap-4 -translate-y-10 md:translate-y-0">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="Profile picture"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              )}
              <div className="">
                <p className="font-semibold text-lg">{session.user.name}</p>
                <button
                  className="text-sm text-gray-300 hover:translate-x-1 transition-all cursor-pointer"
                  onClick={() => setShowManageModal(true)}
                >
                  Manage Account
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="md:translate-y-0 -translate-y-10">
            <p className="text-gray-300 mb-2 font-semibold">Settings</p>
            <div className="flex flex-col gap-2 ml-5 w-48">
              {/* Fetches personalization from database before opening modal */}
              <button
                className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400 cursor-pointer"
                onClick={async () => {
                  setIsLoadingPersonalization(true);
                  try {
                    const res = await fetch("/api/personalize");
                    const data = await res.json();
                    setPersonalization(data.personalization || "");
                    setShowPersonalize(true); // ✅ open only after loading
                  } catch (err) {
                    console.error("Failed to load personalization", err);
                  } finally {
                    setIsLoadingPersonalization(false);
                  }
                }}
              >
                <p>Personalize</p>
                <ChevronRight />
              </button>
              <div className="flex items-center gap-2">
                <p className="text-gray-400">Private Mode</p>
                <Switch
                  checked={privateMode}
                  onChange={togglePrivateMode}
                  className={`${
                    privateMode ? "bg-[#ff7500]" : "bg-gray-300"
                  } relative inline-flex h-6 w-11 items-center rounded-full ml-auto`}
                >
                  <span
                    className={`${
                      privateMode ? "translate-x-5" : "translate-x-1"
                    } inline-block h-5 w-5 transform rounded-full bg-white transition shadow-lg`}
                  />
                </Switch>
              </div>
              <p className="text-xs text-gray-500">
                Warning: Memories captured in Private Mode can't be recovered if
                you lose your device.
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="md:translate-y-0 -translate-y-10">
            <p className="text-gray-300 mb-2 font-semibold">Support</p>
            <div className="flex flex-col gap-2 ml-5 w-48">
              <a
                href="https://twinmind.com/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400"
              >
                <p>Chat with Support</p>
                <ChevronRight />
              </a>
              <a
                href="https://discord.com/invite/nb9bMfXtGT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400"
              >
                <p>Discord</p>
                <ChevronRight />
              </a>
            </div>
          </div>

          {/* Other */}
          <div className="md:translate-y-0 -translate-y-10">
            <p className="text-gray-300 mb-2 font-semibold">Other</p>
            <div className="flex flex-col gap-2 ml-5 w-48">
              <a
                href="https://twinmind.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400"
              >
                <p>Privacy Policy</p>
                <ChevronRight />
              </a>
              <a
                href="https://twinmind.com/legal/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400"
              >
                <p>Terms of Service</p>
                <ChevronRight />
              </a>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="mt-4 px-10 py-2 bg-[#ff454b] hover:bg-red-600 rounded-full flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer md:translate-y-0 -translate-y-10"
          >
            <LogOut />
            Sign out
          </button>
        </div>
      </div>

      {/* Personalize modal pop-up */}
      {showPersonalize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white rounded-xl p-6 w-[500px] shadow-lg"
            ref={personalizeRef}
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-700 text-center">
              Personalize
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Share your interests, profession, or goals to personalize your
              TwinMind experience.
            </p>
            <textarea
              value={personalization}
              onChange={(e) => setPersonalization(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              rows={4}
              placeholder="e.g. I'm a college student studying CS who loves productivity, journaling, and tech."
            />
            <div className="mt-4 flex justify-end space-x-8">
              <button
                onClick={() => setShowPersonalize(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/personalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: personalization }),
                  });
                  setShowPersonalize(false);
                }}
                className="text-sm text-white bg-gradient-to-b from-[#1f587c] to-[#527a92] px-5 py-1 rounded-full hover:scale-105 transition-all duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showManageModal && session?.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center">
          <div
            className="bg-white p-6 rounded-xl shadow-lg w-[400px]"
            ref={manageRef}
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-700 text-center">
              Account
            </h2>
            <div className="flex flex-col items-center gap-4">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="Profile picture"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              )}
              <div className="text-md font-medium text-gray-500 flex w-full justify-between">
                <p className="text-black">Name:</p>
                {session.user.name}
              </div>
              <div className="text-md text-gray-500 flex w-full justify-between">
                <p className="text-black">Email:</p>
                {session.user.email}
              </div>
              <button
                onClick={async () => {
                  const confirmed = confirm(
                    "Are you sure you want to delete your account? Please remember this is permanent and cannot be undone."
                  );
                  if (!confirmed) return;

                  const res = await fetch("/api/delete-user", {
                    method: "DELETE",
                  });
                  if (res.ok) {
                    // Optionally sign out after deletion
                    signOut();
                  } else {
                    alert("Failed to delete account.");
                  }
                }}
                className="mt-4 px-4 py-2 text-md border border-red-400 text-red-400 rounded-full transition-all  hover:text-red-300 duration-300"
              >
                Delete Account
              </button>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-sm text-gray-500 hover:underline mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
