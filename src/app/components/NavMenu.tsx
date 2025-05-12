"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { SquareArrowRight, SquareArrowLeft, LogOut } from "lucide-react";

export default function NavMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sidebar button */}
      <button
        className={`fixed top-4 left-4 z-50 bg-[#ff7500] text-white px-2 py-2 rounded-xl transition-all duration-300 hover:bg-[#faaa6b] ${
          isOpen ? "left-48" : "left-4"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <SquareArrowLeft /> : <SquareArrowRight />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] text-white p-6 transition-transform duration-300 z-40 rounded-r-3xl flex flex-col items-center justify-center shadow-lg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <>
          <div className="flex flex-col h-full justify-between items-center">
            <div>
              <Image
                src="/twinmind_black.png"
                alt="TwinMind Logo"
                width={150}
                height={150}
                className="mx-auto"
              />

              {session?.user?.image && (
                <Image
                  src={session?.user?.image}
                  alt="Profile picture"
                  width={80}
                  height={80}
                  className="rounded-full mb-4"
                />
              )}
              <p className="font-medium mb-1">{session?.user?.name}</p>
              <p className="text-sm text-gray-200 mb-4">
                {session?.user?.email}
              </p>
            </div>

            <button
              onClick={() => signOut()}
              className="mt-4 px-10 py-2 text-red-500 border-2 border-red-500 bg-white hover:text-red-900 hover:border-red-900 rounded-full flex  gap-2 transition-all duration-300"
            >
              <LogOut /> Sign out
            </button>
          </div>
        </>
      </div>
    </>
  );
}
