import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CaptureClient from "./CaptureClient";

export default async function Capture() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  return <CaptureClient />;
}
