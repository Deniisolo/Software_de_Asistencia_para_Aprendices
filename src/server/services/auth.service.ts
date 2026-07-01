import { signAuthToken } from "@/src/server/config/auth/jwt";
import { compare } from "bcryptjs";
import { normalizeAprendizEstado } from "@/src/lib/aprendizEstado";
import { AuthRepository } from "@/src/server/repositories/auth.repository";

export class AuthService {
  constructor(private readonly repository: AuthRepository = new AuthRepository()) {}

  async login(usemame: string, contrasenia: string) {
    const user = await this.repository.findUserByUsername(usemame);

    if (!user) {
      return { ok: false as const, status: 401, error: "Usuario no encontrado" };
    }

    const isPasswordValid = await compare(contrasenia, user.contrasenia);

    if (!isPasswordValid) {
      return { ok: false as const, status: 401, error: "Contraseña incorrecta" };
    }

    const rol = user.rol.nombreRol.toLowerCase();
    if (rol === "aprendiz") {
      const aprendiz = await this.repository.findAprendizByUsuarioId(user.idUsuario);
      const estado = normalizeAprendizEstado(aprendiz?.estado);
      if (estado === "inactivo") {
        return {
          ok: false as const,
          status: 403,
          error: "Tu cuenta de aprendiz esta inactiva. Contacta a tu instructor."
        };
      }
    }

    const token = signAuthToken({
      id: user.idUsuario,
      usemame: user.usemame,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol.nombreRol.toLowerCase(),
      correo_electronico: user.correoElectronico
    });

    return {
      ok: true as const,
      status: 200,
      data: {
        token,
        user: {
          id: user.idUsuario,
          nombre: user.nombre,
          apellido: user.apellido,
          usemame: user.usemame,
          rol: user.rol.nombreRol,
          correo_electronico: user.correoElectronico
        }
      }
    };
  }
}
