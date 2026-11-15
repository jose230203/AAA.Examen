import type { Rol } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 horas
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logueado = !!auth?.user;
      const enLogin = nextUrl.pathname.startsWith("/login");
      if (enLogin) {
        if (logueado) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return logueado;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
        token.sucursalId = user.sucursalId;
        token.sucursalNombre = user.sucursalNombre;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rol = token.rol as Rol;
      session.user.sucursalId = (token.sucursalId as string | null) ?? null;
      session.user.sucursalNombre = (token.sucursalNombre as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
