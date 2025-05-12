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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/twinmind_logo.webp"
            alt="TwinMind Logo"
            width={100}
            height={100}
          />
          <div className="flex items-center justify-center bg-[#ff7500] text-white rounded-full px-4 py-2 gap-4 font-semibold hover:scale-110 hover:bg-[#faaa6b] transition-all duration-300">
            <LogIn className="w-8 h-8" />
            <SignInButton />
          </div>
        </div>
      </div>
    </>
  );
}
