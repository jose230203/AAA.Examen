import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: Rol;
    sucursalId: string | null;
    sucursalNombre: string | null;
  }
  interface Session {
    user: {
      id: string;
      rol: Rol;
      sucursalId: string | null;
      sucursalNombre: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: Rol;
    sucursalId: string | null;
    sucursalNombre: string | null;
  }
}
