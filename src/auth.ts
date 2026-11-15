import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/schemas/auth";
import { authConfig } from "./auth.config";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { sucursal: true },
        });
        if (!usuario || !usuario.activo) return null;

        // Cuenta bloqueada temporalmente
        if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
          return null;
        }

        const passwordOk = await bcrypt.compare(password, usuario.passwordHash);

        if (!passwordOk) {
          const intentos = usuario.intentosFallidos + 1;
          await prisma.usuario.update({
            where: { id: usuario.id },
            data:
              intentos >= MAX_INTENTOS
                ? {
                    intentosFallidos: 0,
                    bloqueadoHasta: new Date(Date.now() + BLOQUEO_MINUTOS * 60_000),
                  }
                : { intentosFallidos: intentos },
          });
          return null;
        }

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null },
        });

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          sucursalId: usuario.sucursalId,
          sucursalNombre: usuario.sucursal?.nombre ?? null,
        };
      },
    }),
  ],
});
