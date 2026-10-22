// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { DataService } from "@/lib/data-service";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const authOptions: NextAuthOptions = {
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "oO1zYtVpDQ82xaRZv9Q7KACvMjiXUzNNqvXTUj0oFTE=",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Por favor ingresa tu correo y contraseña.");
        }

        const user = await DataService.findUserByEmail(credentials.email);

        if (!user || !user.passwordHash) {
          throw new Error("Correo o contraseña incorrectos.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Correo o contraseña incorrectos.");
        }

        // Validación crítica (solo después de verificar la contraseña):
        // Verificar si el Admin desactivó el acceso del usuario
        if (!user.isActive) {
          throw new Error(
            "Tu cuenta ha sido desactivada por el administrador."
          );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    // Bloquear inicio de sesión por Google SSO si el usuario está desactivado (isActive: false)
    async signIn({ user }) {
      if (!user.email) return false;

      const dbUser = await DataService.findUserByEmail(user.email);

      if (dbUser && !dbUser.isActive) {
        return "/login?error=AccountDisabled";
      }

      // Si entra con Google por primera vez, registrarlo automáticamente
      if (!dbUser) {
        const created = await DataService.createUser({
          name: user.name || user.email.split("@")[0],
          email: user.email,
        });
        user.id = created.id;
        user.role = created.role;
        user.isActive = created.isActive;
      } else {
        user.id = dbUser.id;
        user.role = dbUser.role;
        user.isActive = dbUser.isActive;
      }

      return true;
    },

    // Inyectar rol, id y estado activo en el token JWT (y refrescar estado desde BD en cada request)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
      }

      if (token.id) {
        try {
          const freshUser = await DataService.findUserById(token.id as string);
          if (freshUser) {
            token.role = freshUser.role;
            token.isActive = freshUser.isActive;
          }
        } catch {
          // Mantener claims existentes si la BD está inicializándose
        }
      }

      return token;
    },

    // Exponer id, role e isActive al cliente (useSession / getServerSession)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
};
