"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <>
      <button className="cursor-pointer" onClick={() => signIn()}>
        Let's Go!
      </button>
    </>
  );
}
