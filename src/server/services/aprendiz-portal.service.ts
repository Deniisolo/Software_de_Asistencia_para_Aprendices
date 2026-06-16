import { prisma } from "@/src/server/config/db/prisma";
import { sendAprendizQrResendEmail } from "@/src/server/services/aprendiz-email.service";

export class AprendizPortalError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export class AprendizPortalService {
  async getPortalData(usuarioId: number) {
    const aprendiz = await prisma.aprendiz.findUnique({
      where: { usuarioIdUsuario: usuarioId },
      include: {
        ficha: true,
        usuario: {
          select: {
            idUsuario: true,
            nombre: true,
            apellido: true,
            correoElectronico: true,
            telefono: true,
            numeroDocumento: true,
            usemame: true,
            qrCode: true,
            tipoDocumentoRef: {
              select: { nombreDocumento: true, tipoDocumentoCol: true }
            }
          }
        }
      }
    });

    if (!aprendiz) {
      throw new AprendizPortalError("No se encontró el perfil de aprendiz.", 404);
    }

    const fichaId = aprendiz.fichaIdFicha;
    const programaIdRaw = aprendiz.ficha.idProgramaFormacion;
    const programaId =
      programaIdRaw != null && programaIdRaw !== ""
        ? Number.parseInt(programaIdRaw, 10)
        : NaN;

    const [programa, clases, instructorFichas, asistencias] = await Promise.all([
      Number.isFinite(programaId)
        ? prisma.programaFormacion.findUnique({
            where: { idProgramaFormacion: programaId },
            select: {
              idProgramaFormacion: true,
              nombrePrograma: true,
              nivelFormacion: true
            }
          })
        : Promise.resolve(null),
      prisma.clase.findMany({
        where: { fichaIdFicha: fichaId },
        select: {
          idClase: true,
          nombreTema: true,
          fecha: true,
          horaInicio: true,
          cursoCompetencia: { select: { nombreCurso: true } },
          ambiente: { select: { nombreAmbiente: true } }
        },
        orderBy: [{ fecha: "desc" }, { idClase: "desc" }]
      }),
      prisma.instructorFicha.findMany({
        where: { fichaIdFicha: fichaId },
        include: {
          instructor: {
            include: {
              usuario: {
                select: {
                  idUsuario: true,
                  nombre: true,
                  apellido: true,
                  correoElectronico: true,
                  telefono: true
                }
              }
            }
          }
        }
      }),
      prisma.asistencia.findMany({
        where: { idAprendiz: String(usuarioId) },
        include: {
          clase: {
            select: {
              idClase: true,
              nombreTema: true,
              fecha: true,
              horaInicio: true
            }
          }
        },
        orderBy: [{ fecha: "desc" }, { idAsistencia: "desc" }]
      })
    ]);

    const u = aprendiz.usuario;
    const tipoDoc =
      u.tipoDocumentoRef.tipoDocumentoCol ??
      u.tipoDocumentoRef.nombreDocumento ??
      null;

    return {
      perfil: {
        idUsuario: u.idUsuario,
        nombre: u.nombre,
        apellido: u.apellido,
        correoElectronico: u.correoElectronico,
        telefono: u.telefono,
        numeroDocumento: u.numeroDocumento,
        usemame: u.usemame,
        qrCode: u.qrCode,
        tipoDocumento: tipoDoc
      },
      ficha: {
        idFicha: aprendiz.ficha.idFicha,
        numeroFicha: aprendiz.ficha.numeroFicha,
        programa
      },
      clases: clases.map((c) => ({
        idClase: c.idClase,
        nombreTema: c.nombreTema,
        fecha: c.fecha,
        horaInicio: c.horaInicio,
        competencia: c.cursoCompetencia.nombreCurso,
        ambiente: c.ambiente.nombreAmbiente
      })),
      instructores: instructorFichas.map((row) => ({
        idUsuario: row.instructor.usuario.idUsuario,
        nombre: row.instructor.usuario.nombre,
        apellido: row.instructor.usuario.apellido,
        correoElectronico: row.instructor.usuario.correoElectronico,
        telefono: row.instructor.usuario.telefono
      })),
      asistencias: asistencias.map((a) => ({
        idAsistencia: a.idAsistencia,
        fecha: a.fecha,
        horaIngreso: a.horaIngreso,
        horaFin: a.horaFin,
        estado: a.estadoPresenteTardeAusente,
        clase: a.clase
      }))
    };
  }

  async sendQrToEmail(usuarioId: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: usuarioId },
      select: {
        idUsuario: true,
        nombre: true,
        apellido: true,
        correoElectronico: true,
        qrCode: true,
        aprendiz: { select: { usuarioIdUsuario: true } }
      }
    });

    if (!usuario?.aprendiz) {
      throw new AprendizPortalError("No se encontró el perfil de aprendiz.", 404);
    }

    const qrPayload = usuario.qrCode?.trim();
    if (!qrPayload) {
      throw new AprendizPortalError("No tienes un código QR asignado.", 400);
    }

    const dest = usuario.correoElectronico?.trim();
    if (!dest) {
      throw new AprendizPortalError("No tienes un correo registrado.", 400);
    }

    const sent = await sendAprendizQrResendEmail({
      to: dest,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      qrPayload
    });

    if (!sent) {
      throw new AprendizPortalError(
        "No se pudo enviar el correo. Verifica la configuración SMTP del servidor.",
        503
      );
    }

    return { correo: dest };
  }
}
