import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/src/server/config/db/prisma";
import { validatePassword } from "@/src/lib/validatePassword";
import {
  APRENDIZ_ESTADO_DEFAULT,
  type AprendizEstado,
  normalizeAprendizEstado
} from "@/src/lib/aprendizEstado";
import { sendAprendizQrWelcomeEmail } from "@/src/server/services/aprendiz-email.service";

const ROL_APRENDIZ = 1;
const BCRYPT_ROUNDS = 12;
const DEFAULT_TIPO_DOC_ID = 1;

export type AprendizCreateInput = {
  nombre: string;
  apellido: string;
  correoElectronico: string;
  telefono: string;
  numeroDocumento: string;
  idTipoDocumento: string;
  idGenero: string;
  usemame: string;
  contrasenia: string;
  tipoDocumentoIdTipoDocumento?: number;
  /** Programa elegido en el formulario (debe coincidir con la ficha). */
  idProgramaFormacion: string;
  /** Ficha existente del programa. */
  fichaIdFicha: number;
  estado?: AprendizEstado;
};

export type AprendizUpdateInput = {
  nombre?: string;
  apellido?: string;
  correoElectronico?: string;
  telefono?: string;
  numeroDocumento?: string;
  idTipoDocumento?: string;
  idGenero?: string;
  usemame?: string;
  contrasenia?: string | null;
  qrCode?: string | null;
  /** Cambiar ficha: enviar junto con idProgramaFormacion para validar. */
  idProgramaFormacion?: string | null;
  fichaIdFicha?: number;
  estado?: AprendizEstado;
};

export class InstructorAprendicesCrudService {
  private async nextUsuarioId(): Promise<number> {
    const agg = await prisma.usuario.aggregate({ _max: { idUsuario: true } });
    return (agg._max.idUsuario ?? 0) + 1;
  }

  async listGestion() {
    const [aprendices, programas] = await Promise.all([
      prisma.aprendiz.findMany({
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nombre: true,
              apellido: true,
              numeroDocumento: true,
              correoElectronico: true,
              telefono: true,
              usemame: true,
              idTipoDocumento: true,
              idGenero: true,
              rolIdRol: true,
              qrCode: true
            }
          },
          ficha: {
            select: {
              idFicha: true,
              numeroFicha: true,
              idProgramaFormacion: true
            }
          }
        },
        orderBy: { usuarioIdUsuario: "asc" }
      }),
      prisma.programaFormacion.findMany({
        orderBy: { nombrePrograma: "asc" },
        select: { idProgramaFormacion: true, nombrePrograma: true }
      })
    ]);

    const programaNombrePorId = new Map(
      programas.map((p) => [String(p.idProgramaFormacion), p.nombrePrograma])
    );

    const rows = aprendices.map((a) => ({
      ...a,
      programaNombre:
        a.ficha.idProgramaFormacion != null && a.ficha.idProgramaFormacion !== ""
          ? programaNombrePorId.get(a.ficha.idProgramaFormacion) ?? null
          : null
    }));

    return { aprendices: rows, programas };
  }

  private normalizeProgramaId(id: string | null | undefined): string | null {
    if (id == null || String(id).trim() === "") return null;
    return String(id).trim();
  }

  private async assertProgramaExists(idProgramaFormacion: string) {
    const n = Number.parseInt(idProgramaFormacion, 10);
    if (!Number.isFinite(n)) throw new Error("Programa de formacion invalido");
    await prisma.programaFormacion.findUniqueOrThrow({
      where: { idProgramaFormacion: n },
      select: { idProgramaFormacion: true }
    });
  }

  /** La ficha debe existir y su idProgramaFormacion debe coincidir con el programa indicado. */
  private async assertFichaEnPrograma(fichaIdFicha: number, idProgramaFormacion: string) {
    const ficha = await prisma.ficha.findUnique({
      where: { idFicha: fichaIdFicha },
      select: { idFicha: true, idProgramaFormacion: true }
    });
    if (!ficha) throw new Error("Ficha no encontrada");
    const prog = this.normalizeProgramaId(idProgramaFormacion);
    if (prog == null) throw new Error("Seleccione un programa de formacion");
    const fichaProg = this.normalizeProgramaId(ficha.idProgramaFormacion);
    if (fichaProg !== prog) {
      throw new Error("La ficha no pertenece al programa seleccionado");
    }
  }

  private normalizePhoneDigits(telefono: string): string {
    return telefono.replace(/\D/g, "");
  }

  private async assertCorreoLibre(correoElectronico: string, exceptUsuarioId?: number) {
    const normalized = correoElectronico.trim().toLowerCase();
    const u = await prisma.usuario.findFirst({
      where: {
        rolIdRol: ROL_APRENDIZ,
        correoElectronico: { equals: normalized, mode: "insensitive" }
      },
      select: { idUsuario: true }
    });
    if (u && u.idUsuario !== exceptUsuarioId) {
      throw new Error("Ya existe un aprendiz con ese correo electronico");
    }
  }

  private async assertTelefonoLibre(telefono: string, exceptUsuarioId?: number) {
    const digits = this.normalizePhoneDigits(telefono);
    if (!digits) return;

    const aprendices = await prisma.aprendiz.findMany({
      select: {
        usuarioIdUsuario: true,
        usuario: { select: { telefono: true } }
      }
    });

    for (const ap of aprendices) {
      if (
        ap.usuarioIdUsuario !== exceptUsuarioId &&
        this.normalizePhoneDigits(ap.usuario.telefono) === digits
      ) {
        throw new Error("Ya existe un aprendiz con ese numero de telefono");
      }
    }
  }

  private async assertUsemameLibre(usemame: string, exceptUsuarioId?: number) {
    const u = await prisma.usuario.findFirst({
      where: { usemame },
      select: { idUsuario: true }
    });
    if (u && u.idUsuario !== exceptUsuarioId) {
      throw new Error("El nombre de usuario ya esta en uso");
    }
  }

  private async assertDocumentoLibre(numeroDocumento: string, exceptUsuarioId?: number) {
    const u = await prisma.usuario.findFirst({
      where: { numeroDocumento, rolIdRol: ROL_APRENDIZ },
      select: { idUsuario: true }
    });
    if (u && u.idUsuario !== exceptUsuarioId) {
      throw new Error("Ya existe un aprendiz con ese numero de documento");
    }
  }

  private assertPersonName(value: string, label: "nombre" | "apellido") {
    const v = value.trim();
    const labelText = label === "nombre" ? "nombre" : "apellido";
    if (/\d/.test(v)) {
      throw new Error(`El ${labelText} no puede contener numeros`);
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(v)) {
      throw new Error(`El ${labelText} solo puede contener letras, espacios, guiones o apostrofes`);
    }
  }

  async createAprendizCompleto(input: AprendizCreateInput) {
    const nombre = input.nombre?.trim() ?? "";
    const apellido = input.apellido?.trim() ?? "";
    const correoElectronico = input.correoElectronico?.trim() ?? "";
    const telefono = input.telefono?.trim() ?? "";
    const numeroDocumento = input.numeroDocumento?.trim() ?? "";
    const idTipoDocumento = input.idTipoDocumento?.trim() ?? "CC";
    const idGenero = input.idGenero?.trim() ?? "M";
    const usemame = input.usemame?.trim() ?? "";
    const contrasenia = input.contrasenia ?? "";
    const idProg = String(input.idProgramaFormacion ?? "").trim();

    if (!nombre || !apellido || !correoElectronico || !telefono || !numeroDocumento || !usemame) {
      throw new Error("Complete nombre, apellido, correo, telefono, documento y usuario");
    }
    this.assertPersonName(nombre, "nombre");
    this.assertPersonName(apellido, "apellido");
    const passwordError = validatePassword(contrasenia);
    if (passwordError) throw new Error(passwordError);
    if (!idProg) {
      throw new Error("Seleccione un programa de formacion");
    }
    if (!Number.isFinite(input.fichaIdFicha) || input.fichaIdFicha < 1) {
      throw new Error("Seleccione una ficha");
    }

    const tipoDocId = input.tipoDocumentoIdTipoDocumento ?? DEFAULT_TIPO_DOC_ID;
    await prisma.tipoDocumento.findUniqueOrThrow({
      where: { idTipoDocumento: tipoDocId },
      select: { idTipoDocumento: true }
    });

    await this.assertProgramaExists(idProg);
    await this.assertFichaEnPrograma(input.fichaIdFicha, idProg);

    await this.assertUsemameLibre(usemame);
    await this.assertDocumentoLibre(numeroDocumento);
    await this.assertCorreoLibre(correoElectronico);
    await this.assertTelefonoLibre(telefono);

    const idUsuario = await this.nextUsuarioId();
    const hashed = await hash(contrasenia, BCRYPT_ROUNDS);
    const qr = randomUUID();
    const estado = normalizeAprendizEstado(input.estado) ?? APRENDIZ_ESTADO_DEFAULT;

    const row = await prisma.$transaction(async (tx) => {
      await tx.usuario.create({
        data: {
          idUsuario,
          nombre,
          apellido,
          correoElectronico,
          telefono,
          numeroDocumento,
          idTipoDocumento,
          idGenero,
          usemame,
          contrasenia: hashed,
          qrCode: qr,
          rolIdRol: ROL_APRENDIZ,
          tipoDocumentoIdTipoDocumento: tipoDocId
        }
      });

      return tx.aprendiz.create({
        data: {
          usuarioIdUsuario: idUsuario,
          fichaIdFicha: input.fichaIdFicha,
          estado
        }
      });
    });

    void sendAprendizQrWelcomeEmail({
      to: correoElectronico,
      nombre,
      apellido,
      qrPayload: qr
    }).catch((err) => {
      console.error("[instructor-aprendices] Correo con QR no enviado:", err);
    });

    return row;
  }

  async updateAprendiz(usuarioIdUsuario: number, input: AprendizUpdateInput) {
    const ap = await prisma.aprendiz.findUnique({
      where: { usuarioIdUsuario },
      include: {
        usuario: {
          select: {
            idUsuario: true,
            rolIdRol: true,
            correoElectronico: true,
            nombre: true,
            apellido: true,
            qrCode: true
          }
        },
        ficha: { select: { idFicha: true } }
      }
    });

    if (!ap || ap.usuario.rolIdRol !== ROL_APRENDIZ) {
      throw new Error("Aprendiz no encontrado");
    }

    const correoAnterior = ap.usuario.correoElectronico.trim().toLowerCase();

    if (input.usemame !== undefined) {
      await this.assertUsemameLibre(input.usemame.trim(), usuarioIdUsuario);
    }
    if (input.numeroDocumento !== undefined) {
      await this.assertDocumentoLibre(input.numeroDocumento.trim(), usuarioIdUsuario);
    }
    if (input.correoElectronico !== undefined) {
      await this.assertCorreoLibre(input.correoElectronico.trim(), usuarioIdUsuario);
    }
    if (input.telefono !== undefined) {
      await this.assertTelefonoLibre(input.telefono.trim(), usuarioIdUsuario);
    }

    if (input.fichaIdFicha !== undefined) {
      const progRaw = input.idProgramaFormacion;
      const prog =
        progRaw != null && String(progRaw).trim() !== "" ? String(progRaw).trim() : null;
      if (prog == null) throw new Error("Seleccione el programa de formacion de la ficha");
      await this.assertProgramaExists(prog);
      await this.assertFichaEnPrograma(input.fichaIdFicha, prog);
    }

    const usuarioData: Record<string, unknown> = {};
    if (input.nombre !== undefined) {
      const v = input.nombre.trim();
      this.assertPersonName(v, "nombre");
      usuarioData.nombre = v;
    }
    if (input.apellido !== undefined) {
      const v = input.apellido.trim();
      this.assertPersonName(v, "apellido");
      usuarioData.apellido = v;
    }
    if (input.correoElectronico !== undefined) usuarioData.correoElectronico = input.correoElectronico.trim();
    if (input.telefono !== undefined) usuarioData.telefono = input.telefono.trim();
    if (input.numeroDocumento !== undefined) usuarioData.numeroDocumento = input.numeroDocumento.trim();
    if (input.idTipoDocumento !== undefined) usuarioData.idTipoDocumento = input.idTipoDocumento.trim();
    if (input.idGenero !== undefined) usuarioData.idGenero = input.idGenero.trim();
    if (input.usemame !== undefined) usuarioData.usemame = input.usemame.trim();
    if (input.qrCode !== undefined) usuarioData.qrCode = input.qrCode?.trim() || null;

    if (input.contrasenia != null && input.contrasenia.trim() !== "") {
      const passwordError = validatePassword(input.contrasenia);
      if (passwordError) throw new Error(passwordError);
      usuarioData.contrasenia = await hash(input.contrasenia, BCRYPT_ROUNDS);
    }

    const cambiaFicha =
      input.fichaIdFicha !== undefined && input.fichaIdFicha !== ap.fichaIdFicha;

    const aprendizData: Record<string, unknown> = {};
    if (input.estado !== undefined) {
      const estado = normalizeAprendizEstado(input.estado);
      if (!estado) throw new Error("Estado invalido. Use activo o inactivo");
      aprendizData.estado = estado;
    }

    const row = await prisma.$transaction(async (tx) => {
      if (Object.keys(usuarioData).length > 0) {
        await tx.usuario.update({
          where: { idUsuario_rolIdRol: { idUsuario: usuarioIdUsuario, rolIdRol: ROL_APRENDIZ } },
          data: usuarioData
        });
      }

      if (cambiaFicha && input.fichaIdFicha != null) {
        const estadoActual =
          (input.estado != null ? normalizeAprendizEstado(input.estado) : null) ??
          normalizeAprendizEstado(ap.estado) ??
          APRENDIZ_ESTADO_DEFAULT;
        await tx.aprendiz.delete({ where: { usuarioIdUsuario } });
        await tx.aprendiz.create({
          data: { usuarioIdUsuario, fichaIdFicha: input.fichaIdFicha, estado: estadoActual }
        });
      } else if (Object.keys(aprendizData).length > 0) {
        await tx.aprendiz.update({
          where: { usuarioIdUsuario },
          data: aprendizData
        });
      }

      return tx.aprendiz.findUniqueOrThrow({
        where: { usuarioIdUsuario },
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nombre: true,
              apellido: true,
              numeroDocumento: true,
              usemame: true,
              correoElectronico: true,
              telefono: true,
              qrCode: true
            }
          },
          ficha: true
        }
      });
    });

    const correoCambio =
      input.correoElectronico !== undefined &&
      input.correoElectronico.trim().toLowerCase() !== correoAnterior;

    if (correoCambio) {
      const qr = row.usuario.qrCode?.trim();
      if (qr) {
        void sendAprendizQrWelcomeEmail({
          to: row.usuario.correoElectronico,
          nombre: row.usuario.nombre,
          apellido: row.usuario.apellido,
          qrPayload: qr
        }).catch((err) => {
          console.error("[instructor-aprendices] QR no reenviado tras cambio de correo:", err);
        });
      } else {
        console.warn(
          `[instructor-aprendices] Aprendiz #${usuarioIdUsuario} sin QR; no se reenvia correo`
        );
      }
    }

    return row;
  }

  /** Elimina solo el aprendiz y su usuario; la ficha y las clases/asistencias del grupo se conservan. */
  async deleteAprendizCompleto(usuarioIdUsuario: number) {
    const ap = await prisma.aprendiz.findUnique({
      where: { usuarioIdUsuario },
      select: { fichaIdFicha: true }
    });
    if (!ap) throw new Error("Aprendiz no encontrado");

    await prisma.$transaction(async (tx) => {
      await tx.aprendiz.delete({ where: { usuarioIdUsuario } });

      await tx.estado.deleteMany({ where: { usuarioIdUsuario } }).catch(() => {});
      await tx.genero
        .deleteMany({
          where: { usuarioIdUsuario, usuarioRolIdRol: ROL_APRENDIZ }
        })
        .catch(() => {});
      await tx.nivelDeFormacion
        .deleteMany({
          where: { usuarioIdAprendiz: usuarioIdUsuario, usuarioRolIdRol: ROL_APRENDIZ }
        })
        .catch(() => {});

      await tx.usuario.delete({
        where: { idUsuario_rolIdRol: { idUsuario: usuarioIdUsuario, rolIdRol: ROL_APRENDIZ } }
      });
    });
  }
}
