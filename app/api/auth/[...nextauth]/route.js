import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "../../../lib/prisma";

function cleanApiErrorMessage(error) {
  try {
    if (error.startsWith("API Error:")) {
      const json = error.replace(/^API Error: \d+ - /, "");
      return JSON.parse(json).message || "Authentication failed";
    }
  } catch {}
  return error || "Authentication failed";
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password)
            throw new Error("Missing email or password");

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              role: true
            }
          });

          if (!user) throw new Error("User does not exist");

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) {
            throw new Error("Invalid password")
          };

          return {
            id: user.userId,
            email: user.email,
            name: user.firstName + " " + user.lastName,
            role: user.role.roleName
          };
        } catch (err) {
          throw new Error(cleanApiErrorMessage(err.message));
        }
      }
    })
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    }
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin"
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
