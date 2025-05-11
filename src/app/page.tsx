import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/capture");
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="grid grid-rows-3 mx-auto">
          <Image
            src="/twinmind_logo.webp"
            alt="TwinMind Logo"
            width={100}
            height={100}
            className=""
          />
          <button>Login</button>
          <button>Sign-up</button>
        </div>
      </div>
    </>
  );
}
