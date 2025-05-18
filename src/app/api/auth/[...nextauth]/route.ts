import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Extend Session type
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
  }
}

// --- NEW CODE: Function to refresh access token ---
async function refreshAccessToken(token: any) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
      });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const refreshedTokens = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// --- Main config ---
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
    • You can record audio and get a transcript along with asummary.
    • Ask questions now or later based on your past transcripts!
    
    Action Items:
    1. Try recording your own thought now.
    2. Ask a question like "What is this transcript about?"
    
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
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + account.expires_at! * 1000,
          refreshToken: account.refresh_token,
        };
      }

      // Return previous token if access token is still valid
      if (
        token.accessTokenExpires &&
        Date.now() < (token.accessTokenExpires as number)
      ) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
