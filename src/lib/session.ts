import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { sessionSecret } from "./config";

export type SessionData = {
  isLoggedIn: boolean;
  mock: boolean;
  importMode: boolean;
  accountName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  oauthState?: string;
};

export function sessionOptions(): SessionOptions {
  return {
    password: sessionSecret(),
    cookieName: "stashfound",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
