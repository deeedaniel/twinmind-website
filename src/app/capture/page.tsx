import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CaptureClient from "./CaptureClient";
import NavMenu from "../components/NavMenu";

export default async function Capture() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  return (
    <>
      <NavMenu />
      <CaptureClient />
    </>
  );
}
