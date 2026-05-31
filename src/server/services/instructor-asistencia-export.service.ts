import { buildAsistenciaExcelWorkbook } from "@/src/features/instructor/lib/buildAsistenciaExcelWorkbook";
import { InstructorFiltrosService } from "@/src/server/services/instructor-filtros.service";
import { prisma } from "@/src/server/config/db/prisma";

export class InstructorAsistenciaExportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function buildFileBaseName(claseId: number, claseFecha: string | null) {
  const datePart = claseFecha?.replace(/[^\d-]/g, "") || "sin-fecha";
  return `asistencia-clase-${claseId}-${datePart}`;
}

export class InstructorAsistenciaExportService {
  private filtrosService = new InstructorFiltrosService();

  async generateExcelBuffer(claseId: number) {
    const clase = await prisma.clase.findUnique({
      where: { idClase: claseId },
      include: {
        ambiente: { select: { nombreAmbiente: true } },
        cursoCompetencia: { select: { nombreCurso: true } },
        ficha: { select: { numeroFicha: true, idProgramaFormacion: true } }
      }
    });

    if (!clase) {
      throw new InstructorAsistenciaExportError("Clase no encontrada.", 404);
    }

    let programaNombre: string | null = null;
    const programaId = clase.ficha.idProgramaFormacion
      ? Number.parseInt(clase.ficha.idProgramaFormacion, 10)
      : NaN;

    if (Number.isFinite(programaId)) {
      const programa = await prisma.programaFormacion.findUnique({
        where: { idProgramaFormacion: programaId },
        select: { nombrePrograma: true }
      });
      programaNombre = programa?.nombrePrograma ?? null;
    }

    const asistencias = await this.filtrosService.listAsistenciasPorClase(claseId);

    const buffer = Buffer.from(
      await buildAsistenciaExcelWorkbook({
        claseId: clase.idClase,
        claseFecha: clase.fecha,
        claseHoraInicio: clase.horaInicio,
        ambiente: clase.ambiente.nombreAmbiente,
        programaNombre,
        competenciaNombre: clase.cursoCompetencia.nombreCurso,
        fichaNumero: clase.ficha.numeroFicha ?? String(clase.fichaIdFicha),
        asistencias
      })
    );

    return {
      buffer,
      filename: `${buildFileBaseName(clase.idClase, clase.fecha)}.xlsx`
    };
  }
}
