import { prisma } from "@/src/server/config/db/prisma";

export class AuthRepository {
  async findUserByUsername(usemame: string) {
    return prisma.usuario.findFirst({
      where: { usemame },
      include: { rol: true }
    });
  }

  async findAprendizByUsuarioId(usuarioIdUsuario: number) {
    return prisma.aprendiz.findUnique({
      where: { usuarioIdUsuario },
      select: { estado: true }
    });
  }
}

