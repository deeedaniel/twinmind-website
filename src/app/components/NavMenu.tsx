"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import {
  SquareArrowRight,
  SquareArrowLeft,
  LogOut,
  ChevronRight,
} from "lucide-react";

export default function NavMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

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
              src="/twinmind_black.png"
              alt="TwinMind Logo"
              width={150}
              height={150}
              className="mx-auto"
            />
          </a>

          {/* Profile */}
          {session?.user && (
            <div className="flex items-center gap-4">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="Profile picture"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              )}
              <div className="flex flex-col">
                <p className="font-medium">{session.user.name}</p>
                <button className="text-sm text-gray-300 hover:translate-x-1 transition-all cursor-pointer">
                  Manage Account
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div>
            <p className="text-gray-300 mb-2">Settings</p>
            <div className="flex flex-col gap-2 ml-5 w-48">
              <button className="flex justify-between gap-2 hover:translate-x-1 transition-transform text-gray-400 cursor-pointer">
                <p>Personalize</p>
                <ChevronRight />
              </button>
            </div>
          </div>

          {/* Support */}
          <div>
            <p className="text-gray-300 mb-2">Support</p>
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
          <div>
            <p className="text-gray-300 mb-2">Other</p>
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
            className="mt-4 px-10 py-2 bg-[#ff454b] hover:bg-red-600 rounded-full flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
          >
            <LogOut />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
