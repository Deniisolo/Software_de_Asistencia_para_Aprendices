import { normalizeProgramaFormacionId } from "@/src/lib/programaFormacionId";
import { prisma } from "@/src/server/config/db/prisma";
import { fechaDentroDeRango, fechasSemanalesEnRango } from "@/src/server/lib/weekly-dates";

export type ClaseGestionInput = {
  nombreTema?: string | null;
  fecha?: string | null;
  horaInicio?: string | null;
  ambienteIdAmbiente: number;
  cursoCompetenciaIdCurso: number;
  fichaIdFicha: number;
  trimestreIdTrimestre?: number | null;
  repetirSemanal?: boolean;
  diaSemana?: number | null;
};

export class InstructorClasesCrudError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "InstructorClasesCrudError";
  }
}

export class InstructorClasesCrudService {
  private async assertCompetenciaPerteneceAFicha(
    fichaIdFicha: number,
    cursoCompetenciaIdCurso: number
  ) {
    const ficha = await prisma.ficha.findUnique({
      where: { idFicha: fichaIdFicha },
      select: { idProgramaFormacion: true }
    });

    if (!ficha?.idProgramaFormacion) {
      throw new InstructorClasesCrudError("La ficha seleccionada no existe.", 400);
    }

    const programaId = Number.parseInt(ficha.idProgramaFormacion, 10);
    if (!Number.isFinite(programaId)) {
      throw new InstructorClasesCrudError(
        "La ficha seleccionada no tiene un programa de formacion valido.",
        400
      );
    }

    const relacion = await prisma.programaFormacionHasCursoCompetencia.findFirst({
      where: {
        programaFormacionIdProgramaFormacion: programaId,
        cursoCompetenciaIdCurso: cursoCompetenciaIdCurso
      },
      select: { cursoCompetenciaIdCurso: true }
    });

    if (!relacion) {
      throw new InstructorClasesCrudError(
        "La competencia seleccionada no pertenece al programa de la ficha.",
        400
      );
    }
  }

  async listGestion() {
    const [clases, ambientes, cursos, fichas, trimestres, competenciasPorPrograma] = await Promise.all([
      prisma.clase.findMany({
        orderBy: [{ fecha: "asc" }, { idClase: "desc" }],
        include: {
          ambiente: { select: { idAmbiente: true, nombreAmbiente: true } },
          cursoCompetencia: { select: { idCurso: true, nombreCurso: true } },
          ficha: { select: { idFicha: true, numeroFicha: true } },
          trimestre: { select: { idTrimestre: true, nombre: true } }
        }
      }),
      prisma.ambiente.findMany({
        orderBy: { idAmbiente: "asc" },
        select: { idAmbiente: true, nombreAmbiente: true, ubicacion: true }
      }),
      prisma.cursoCompetencia.findMany({
        orderBy: { nombreCurso: "asc" },
        select: { idCurso: true, nombreCurso: true }
      }),
      prisma.ficha.findMany({
        orderBy: { idFicha: "desc" },
        select: { idFicha: true, numeroFicha: true, idProgramaFormacion: true }
      }),
      prisma.trimestre.findMany({
        orderBy: [{ fechaInicio: "desc" }, { nombre: "asc" }],
        select: { idTrimestre: true, nombre: true, fechaInicio: true, fechaFin: true }
      }),
      prisma.programaFormacionHasCursoCompetencia.findMany({
        include: {
          cursoCompetencia: {
            select: { idCurso: true, nombreCurso: true }
          }
        }
      })
    ]);

    const competenciasPorProgramaMap: Record<
      string,
      Array<{ idCurso: number; nombreCurso: string }>
    > = {};

    for (const row of competenciasPorPrograma) {
      const key = normalizeProgramaFormacionId(String(row.programaFormacionIdProgramaFormacion));
      if (key == null) continue;
      const list = competenciasPorProgramaMap[key] ?? [];
      list.push(row.cursoCompetencia);
      competenciasPorProgramaMap[key] = list;
    }

    for (const key of Object.keys(competenciasPorProgramaMap)) {
      competenciasPorProgramaMap[key].sort((a, b) =>
        a.nombreCurso.localeCompare(b.nombreCurso, "es")
      );
    }

    const fichasConCompetencias = fichas
      .map((ficha) => {
        const programaKey = normalizeProgramaFormacionId(ficha.idProgramaFormacion);
        const competencias =
          programaKey != null ? (competenciasPorProgramaMap[programaKey] ?? []) : [];
        return { ...ficha, competencias };
      })
      .sort((a, b) => {
        const aHas = a.competencias.length > 0 ? 1 : 0;
        const bHas = b.competencias.length > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return b.idFicha - a.idFicha;
      });

    return {
      clases,
      ambientes,
      cursos,
      fichas: fichasConCompetencias,
      trimestres,
      competenciasPorPrograma: competenciasPorProgramaMap
    };
  }

  private async getTrimestreOrThrow(trimestreId: number) {
    const trimestre = await prisma.trimestre.findUnique({ where: { idTrimestre: trimestreId } });
    if (!trimestre) {
      throw new InstructorClasesCrudError("El trimestre seleccionado no existe.", 400);
    }
    return trimestre;
  }

  private resolveFechasClase(
    input: ClaseGestionInput,
    trimestre: { fechaInicio: string; fechaFin: string }
  ): string[] {
    if (input.repetirSemanal) {
      if (input.diaSemana == null || !Number.isInteger(input.diaSemana) || input.diaSemana < 0 || input.diaSemana > 6) {
        throw new InstructorClasesCrudError("Seleccione un dia de la semana valido para la repeticion.", 400);
      }
      const fechas = fechasSemanalesEnRango(trimestre.fechaInicio, trimestre.fechaFin, input.diaSemana);
      if (fechas.length === 0) {
        throw new InstructorClasesCrudError(
          "No hay fechas disponibles para ese dia dentro del trimestre seleccionado.",
          400
        );
      }
      return fechas;
    }

    const fecha = input.fecha?.trim();
    if (!fecha) {
      throw new InstructorClasesCrudError("La fecha es obligatoria cuando no se repite semanalmente.", 400);
    }
    if (!fechaDentroDeRango(fecha, trimestre.fechaInicio, trimestre.fechaFin)) {
      throw new InstructorClasesCrudError("La fecha debe estar dentro del rango del trimestre seleccionado.", 400);
    }
    return [fecha];
  }

  private async nextClaseId(): Promise<number> {
    const agg = await prisma.clase.aggregate({ _max: { idClase: true } });
    return (agg._max.idClase ?? 0) + 1;
  }

  async createClase(input: ClaseGestionInput) {
    await this.assertCompetenciaPerteneceAFicha(
      input.fichaIdFicha,
      input.cursoCompetenciaIdCurso
    );

    if (input.trimestreIdTrimestre == null) {
      throw new InstructorClasesCrudError("Debe seleccionar un trimestre para la clase.", 400);
    }

    const trimestre = await this.getTrimestreOrThrow(input.trimestreIdTrimestre);
    const fechas = this.resolveFechasClase(input, trimestre);
    const horaInicio = input.horaInicio?.trim() || null;
    const nombreTema = input.nombreTema?.trim() || null;

    let nextId = await this.nextClaseId();
    const clasesCreadas = await prisma.$transaction(
      fechas.map((fecha) => {
        const idClase = nextId++;
        return prisma.clase.create({
          data: {
            idClase,
            nombreTema,
            fecha,
            horaInicio,
            ambienteIdAmbiente: input.ambienteIdAmbiente,
            cursoCompetenciaIdCurso: input.cursoCompetenciaIdCurso,
            fichaIdFicha: input.fichaIdFicha,
            trimestreIdTrimestre: input.trimestreIdTrimestre
          }
        });
      })
    );

    return {
      clases: clasesCreadas,
      totalCreadas: clasesCreadas.length
    };
  }

  async updateClase(idClase: number, input: Partial<ClaseGestionInput>) {
    const actual = await prisma.clase.findUnique({
      where: { idClase },
      select: { fichaIdFicha: true, cursoCompetenciaIdCurso: true }
    });

    if (!actual) {
      throw new InstructorClasesCrudError("La clase no existe.", 404);
    }

    const fichaId = input.fichaIdFicha ?? actual.fichaIdFicha;
    const cursoId = input.cursoCompetenciaIdCurso ?? actual.cursoCompetenciaIdCurso;
    await this.assertCompetenciaPerteneceAFicha(fichaId, cursoId);

    const data: Record<string, unknown> = {};
    if (input.nombreTema !== undefined) data.nombreTema = input.nombreTema?.trim() || null;
    if (input.fecha !== undefined) {
      const fecha = input.fecha?.trim() || null;
      if (fecha) {
        const trimestreId =
          input.trimestreIdTrimestre ??
          (
            await prisma.clase.findUnique({
              where: { idClase },
              select: { trimestreIdTrimestre: true }
            })
          )?.trimestreIdTrimestre;

        if (trimestreId != null) {
          const trimestre = await this.getTrimestreOrThrow(trimestreId);
          if (!fechaDentroDeRango(fecha, trimestre.fechaInicio, trimestre.fechaFin)) {
            throw new InstructorClasesCrudError(
              "La fecha debe estar dentro del rango del trimestre seleccionado.",
              400
            );
          }
        }
      }
      data.fecha = fecha;
    }
    if (input.horaInicio !== undefined) data.horaInicio = input.horaInicio;
    if (input.ambienteIdAmbiente !== undefined) data.ambienteIdAmbiente = input.ambienteIdAmbiente;
    if (input.cursoCompetenciaIdCurso !== undefined)
      data.cursoCompetenciaIdCurso = input.cursoCompetenciaIdCurso;
    if (input.fichaIdFicha !== undefined) data.fichaIdFicha = input.fichaIdFicha;
    if (input.trimestreIdTrimestre !== undefined) {
      if (input.trimestreIdTrimestre == null) {
        throw new InstructorClasesCrudError("Debe seleccionar un trimestre para la clase.", 400);
      }
      await this.getTrimestreOrThrow(input.trimestreIdTrimestre);
      data.trimestreIdTrimestre = input.trimestreIdTrimestre;
    }

    return prisma.clase.update({
      where: { idClase },
      data
    });
  }

  async deleteClase(idClase: number) {
    await prisma.$transaction([
      prisma.asistencia.deleteMany({ where: { claseIdClase: idClase } }),
      prisma.clase.delete({ where: { idClase } })
    ]);
  }
}
