import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import SessionProvider from "./components/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TwinMind",
  description: "Capture Memories, Ask Anything",
  openGraph: {
    title: "TwinMind",
    description: "Capture Memories, Ask Anything",
    siteName: "TwinMind",
    locale: "en_US",
    type: "website",
    url: "https://twinmind-website.vercel.app/",
    images: [
      {
        url: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/51/a9/6b/51a96b65-57ff-b010-80b2-3f5a76c6a086/AppIcon-0-0-1x_U007ephone-0-1-0-85-220.png/512x512bb.jpg",
        width: 512,
        height: 512,
        alt: "TwinMind logo",
      },
    ],
  },

  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
