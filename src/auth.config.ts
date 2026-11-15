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
      session.user.id = token.id;
      session.user.rol = token.rol;
      session.user.sucursalId = token.sucursalId;
      session.user.sucursalNombre = token.sucursalNombre;
      return session;
    },
  },
} satisfies NextAuthConfig;
