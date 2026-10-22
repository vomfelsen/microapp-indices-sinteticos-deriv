// src/app/api/admin/users/[id]/toggle/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const isActive = Boolean(body.isActive);

    // Prevenir que el propio admin se desactive a sí mismo por accidente
    if (id === session.user.id && !isActive) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta de administrador." },
        { status: 400 }
      );
    }

    const updated = await DataService.toggleUserAccess(id, isActive);
    return NextResponse.json({
      id: updated.id,
      isActive: updated.isActive,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al actualizar el acceso del usuario.",
      },
      { status: 400 }
    );
  }
}
