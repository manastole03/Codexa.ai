import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@codexa/db";

const isProd = process.env.NODE_ENV === "production";

// In production we require AUTH_SECRET to be set so JWT signing is deterministic
// across replicas. Fail fast on boot rather than silently issuing unverifiable
// tokens.
if (isProd && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET must be set in production (generate with `openssl rand -base64 32`)."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // trustHost is required when running behind a reverse proxy / load balancer
  // (Vercel, Fly, Render, K8s ingress). NextAuth otherwise rejects callback URLs
  // it can't verify against NEXTAUTH_URL.
  trustHost: true,
  // Lock cookies to the configured URL in production. NextAuth will derive
  // sameSite/secure flags automatically when NEXTAUTH_URL is https.
  useSecureCookies: isProd,
  session: {
    strategy: "jwt"
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        // Cheap input gate before touching the DB. Same shape returns we'd use
        // on bad creds — don't leak which field was wrong.
        if (!email || !password || password.length > 256) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    })
  ],
  pages: {
    signIn: "/"
  }
});
