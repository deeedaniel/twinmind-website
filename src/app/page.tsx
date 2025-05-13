import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SignInButton from "./components/SignIn";
import { LogIn } from "lucide-react";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/capture");
  }

  return (
    <>
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/twinmind_logo.webp"
            alt="TwinMind Logo"
            width={150}
            height={150}
          />
          <div className="flex items-center justify-center bg-[#ff7500] text-white rounded-full px-4 py-2 gap-4 font-semibold hover:scale-110 hover:bg-[#faaa6b] transition-all duration-300 cursor-pointer">
            <LogIn className="w-8 h-8" />
            <SignInButton />
          </div>
          <div className="flex flex-row items-center gap-24 absolute bottom-10">
            <a
              href="https://twinmind.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-all duration-300"
            >
              Privacy Policy
            </a>
            <a
              href="https://twinmind.com/legal/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-all duration-300"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
