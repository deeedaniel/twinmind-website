import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Extend Session type to include `user.id` and `accessToken`
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
            },
          });
          await prisma.transcript.create({
            data: {
              userId: newUser.id,
              text: `Hey there! Welcome to TwinMind. This is your first memory! We created this to show you how things work, you can record, reflect, ask questions, and get summaries based on what you record!`,
              summary: {
                create: {
                  summaryTitle: "👋 Welcome to TwinMind!",
                  summaryText: `
    • This is your first TwinMind memory.
    • You can record audio and get a summary.
    • Ask questions later based on your past thoughts!
    
    Action Items:
    1. Try recording your own thought now.
    2. Ask a question like “What did I say yesterday?”
    
    P.S. (🤫 You can personalize your profile in the personalization in the sidebar.)
                  `.trim(),
                },
              },
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token; // store access token for calendar
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      // Pass accessToken to session if you need it for calendar fetches
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
