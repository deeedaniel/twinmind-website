import Image from "next/image";

export default function Home() {
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
