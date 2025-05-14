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
      {/* Sidebar button */}
      <button
        className={`fixed top-4 left-4 z-50 bg-[#ff7500] text-white px-2 py-2 rounded-xl transition-all duration-300 hover:bg-[#faaa6b] cursor-pointer shadow-md ${
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

              <div className="flex items-center gap-6">
                {session?.user?.image && (
                  <Image
                    src={session?.user?.image}
                    alt="Profile picture"
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                )}
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="font-medium">{session?.user?.name}</p>
                  <button className="text-sm cursor-pointer hover:translate-x-1 transition-all duration-200">
                    Manage Account
                  </button>
                </div>
              </div>
              {/* 
              <p className="text-sm text-gray-200 mb-4">
                {session?.user?.email}
              </p>
                */}
            </div>

            <div className="flex flex-col gap-20">
              <div>
                <p className="text-gray-200">Support</p>
                <div className="flex flex-col gap-2 ml-5 mt-2 w-48">
                  <a
                    href="https://twinmind.com/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between gap-2 transition-transform duration-200 hover:translate-x-1 text-gray-300"
                  >
                    <p>Chat with Support</p>
                    <ChevronRight />
                  </a>
                  <a
                    href="https://discord.com/invite/nb9bMfXtGT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between gap-2 transition-transform duration-200 hover:translate-x-1 text-gray-300"
                  >
                    <p>Discord</p>
                    <ChevronRight />
                  </a>
                </div>
              </div>

              <div>
                <p className="text-gray-200">Other</p>
                <div className="flex flex-col gap-2 ml-5 mt-2 w-48">
                  <a
                    href="https://twinmind.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between gap-2 transition-transform duration-200 hover:translate-x-1 text-gray-300"
                  >
                    <p>Privacy Policy</p>
                    <ChevronRight />
                  </a>
                  <a
                    href="https://twinmind.com/legal/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between gap-2 transition-transform duration-200 hover:translate-x-1 text-gray-300"
                  >
                    <p>Terms of Service</p>
                    <ChevronRight />
                  </a>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="mt-4 px-10 py-2 text-white  bg-[#ff454b] hover:bg-red-600  rounded-full flex  gap-2 transition-all duration-300 cursor-pointer"
              >
                <LogOut /> Sign out
              </button>
            </div>
          </div>
        </>
      </div>
    </>
  );
}
