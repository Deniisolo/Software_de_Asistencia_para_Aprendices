import { evaluarEscaneoClase } from "@/src/features/instructor/lib/claseEscaneoPermitido";
import { normalizeAprendizEstado } from "@/src/lib/aprendizEstado";
import { prisma } from "@/src/server/config/db/prisma";

type EstadoAsistencia = "presente" | "tarde" | "ausente";
type AsistenciaClient = Pick<typeof prisma, "asistencia">;

export type RegistrarAsistenciaQrInput = {
  claseId: number;
  qrCode: string;
};

export type RegistrarAsistenciaQrResult = {
  idAsistencia: number;
  fecha: string | null;
  horaIngreso: string | null;
  estado: EstadoAsistencia;
  idAprendiz: string;
  aprendizNombre: string;
  documentoAprendiz: string;
};

export class InstructorAsistenciaQrError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "InstructorAsistenciaQrError";
  }
}

function parseHoraAMinutos(value: string | null | undefined): number | null {
  if (!value) return null;
  const [horaRaw, minutoRaw] = value.split(":");
  const hora = Number.parseInt(horaRaw ?? "", 10);
  const minuto = Number.parseInt(minutoRaw ?? "", 10);
  if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null;
  return hora * 60 + minuto;
}

function formatearHoraActual() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function formatearFechaActual() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function determinarEstadoAsistencia(
  horaInicioClase: string | null | undefined,
  horaRegistro: string
): EstadoAsistencia {
  const minutosInicio = parseHoraAMinutos(horaInicioClase);
  const minutosRegistro = parseHoraAMinutos(horaRegistro);

  if (minutosInicio == null || minutosRegistro == null) return "presente";

  const diferencia = minutosRegistro - minutosInicio;
  if (diferencia <= 0) return "presente";
  if (diferencia < 15) return "presente";
  if (diferencia <= 30) return "tarde";
  return "ausente";
}

export class InstructorAsistenciaQrService {
  private async nextAsistenciaId(db: AsistenciaClient) {
    const agg = await db.asistencia.aggregate({ _max: { idAsistencia: true } });
    return (agg._max.idAsistencia ?? 0) + 1;
  }

  async registrar(input: RegistrarAsistenciaQrInput): Promise<RegistrarAsistenciaQrResult> {
    const qrCode = input.qrCode.trim();
    if (!qrCode) {
      throw new InstructorAsistenciaQrError("El codigo QR es requerido.", 400);
    }

    const clase = await prisma.clase.findUnique({
      where: { idClase: input.claseId },
      select: {
        idClase: true,
        fecha: true,
        horaInicio: true,
        fichaIdFicha: true
      }
    });

    if (!clase) {
      throw new InstructorAsistenciaQrError("La clase seleccionada no existe.", 404);
    }

    const escaneo = evaluarEscaneoClase({
      fecha: clase.fecha,
      horaInicio: clase.horaInicio
    });

    if (!escaneo.permitido) {
      throw new InstructorAsistenciaQrError(
        escaneo.motivo ?? "No es posible registrar asistencia por QR para esta clase.",
        403
      );
    }

    const usuario = await prisma.usuario.findFirst({
      where: { qrCode },
      select: {
        idUsuario: true,
        nombre: true,
        apellido: true,
        numeroDocumento: true,
        aprendiz: {
          select: {
            fichaIdFicha: true,
            estado: true
          }
        }
      }
    });

    if (!usuario) {
      throw new InstructorAsistenciaQrError("No se encontro un aprendiz con ese codigo QR.", 404);
    }

    if (!usuario.aprendiz) {
      throw new InstructorAsistenciaQrError(
        "El usuario escaneado no esta registrado como aprendiz.",
        400
      );
    }

    if (usuario.aprendiz.fichaIdFicha !== clase.fichaIdFicha) {
      throw new InstructorAsistenciaQrError(
        "El aprendiz escaneado no pertenece a la ficha de la clase seleccionada.",
        400
      );
    }

    if (normalizeAprendizEstado(usuario.aprendiz.estado) === "inactivo") {
      throw new InstructorAsistenciaQrError(
        "El aprendiz escaneado esta inactivo y no puede registrar asistencia.",
        403
      );
    }

    return prisma.$transaction(async (tx) => {
      const yaRegistrada = await tx.asistencia.findFirst({
        where: {
          claseIdClase: clase.idClase,
          idAprendiz: String(usuario.idUsuario)
        },
        select: { idAsistencia: true }
      });

      if (yaRegistrada) {
        throw new InstructorAsistenciaQrError(
          "La asistencia de este aprendiz ya fue registrada en la clase.",
          409
        );
      }

      const idAsistencia = await this.nextAsistenciaId(tx);
      const horaRegistro = formatearHoraActual();
      const estado = determinarEstadoAsistencia(clase.horaInicio, horaRegistro);
      const asistencia = await tx.asistencia.create({
        data: {
          idAsistencia,
          fecha: clase.fecha ?? formatearFechaActual(),
          horaIngreso: estado === "ausente" ? null : horaRegistro,
          horaFin: null,
          estadoPresenteTardeAusente: estado,
          idAprendiz: String(usuario.idUsuario),
          claseIdClase: clase.idClase
        }
      });

      return {
        idAsistencia: asistencia.idAsistencia,
        fecha: asistencia.fecha,
        horaIngreso: asistencia.horaIngreso,
        estado,
        idAprendiz: String(usuario.idUsuario),
        aprendizNombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        documentoAprendiz: usuario.numeroDocumento
      };
    });
  }
}
