"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { normalizeProgramaFormacionId } from "@/src/lib/programaFormacionId";
import { toDateInputValue } from "@/src/features/instructor/lib/dateInputValue";
import { toTimeInputValue } from "@/src/features/instructor/lib/timeInputValue";
import {
  DIAS_SEMANA,
  hasClaseFormErrors,
  validateClaseForm,
  type ClaseFormErrors,
  type ClaseFormField,
  type ClaseFormValues,
  type TrimestreOpt
} from "@/src/features/instructor/lib/validateClaseForm";
import styles from "./InstructorGestion.module.css";

type AmbienteOpt = { idAmbiente: number; nombreAmbiente: string | null; ubicacion: string | null };
type CursoOpt = { idCurso: number; nombreCurso: string };
type FichaOpt = {
  idFicha: number;
  numeroFicha: string | null;
  idProgramaFormacion: string | null;
  competencias?: CompetenciaOpt[];
};
type CompetenciaOpt = { idCurso: number; nombreCurso: string };
type ClaseRow = {
  idClase: number;
  nombreTema: string | null;
  fecha: string | null;
  horaInicio: string | null;
  ambiente: { idAmbiente: number; nombreAmbiente: string | null };
  cursoCompetencia: { idCurso: number; nombreCurso: string };
  ficha: { idFicha: number; numeroFicha: string | null };
  trimestre: { idTrimestre: number; nombre: string } | null;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <div className={styles.fieldErrorSlot}>
      {message ? (
        <p id={id} className={styles.fieldError} role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function InstructorClasesCrud() {
  const [clases, setClases] = useState<ClaseRow[]>([]);
  const [ambientes, setAmbientes] = useState<AmbienteOpt[]>([]);
  const [cursos, setCursos] = useState<CursoOpt[]>([]);
  const [fichas, setFichas] = useState<FichaOpt[]>([]);
  const [trimestres, setTrimestres] = useState<TrimestreOpt[]>([]);
  const [competenciasPorPrograma, setCompetenciasPorPrograma] = useState<
    Record<string, CompetenciaOpt[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombreTema, setNombreTema] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [fichaId, setFichaId] = useState("");
  const [trimestreId, setTrimestreId] = useState("");
  const [repetirSemanal, setRepetirSemanal] = useState(false);
  const [diaSemana, setDiaSemana] = useState("1");
  const [fieldErrors, setFieldErrors] = useState<ClaseFormErrors>({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.get<{
        ok: boolean;
        clases?: ClaseRow[];
        ambientes?: AmbienteOpt[];
        cursos?: CursoOpt[];
        fichas?: FichaOpt[];
        trimestres?: TrimestreOpt[];
        competenciasPorPrograma?: Record<string, CompetenciaOpt[]>;
        error?: string;
      }>("/api/instructor/clases");
      if (!data.ok) {
        setError(data.error ?? "No se pudieron cargar los datos");
        return;
      }
      setClases(data.clases ?? []);
      setAmbientes(data.ambientes ?? []);
      setCursos(data.cursos ?? []);
      setFichas(data.fichas ?? []);
      setTrimestres(data.trimestres ?? []);
      setCompetenciasPorPrograma(data.competenciasPorPrograma ?? {});
    } catch {
      setError("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const competenciasParaFicha = useCallback(
    (selectedFichaId: string) => {
      const ficha = fichas.find((f) => String(f.idFicha) === selectedFichaId);
      if (!ficha) return [];
      if (ficha.competencias != null) return ficha.competencias;
      const programaKey = normalizeProgramaFormacionId(ficha.idProgramaFormacion);
      if (programaKey == null) return [];
      return competenciasPorPrograma[programaKey] ?? [];
    },
    [competenciasPorPrograma, fichas]
  );

  const primeraFichaConCompetencias = useCallback(() => {
    const conCompetencias = fichas.find((f) => (f.competencias ?? competenciasParaFicha(String(f.idFicha))).length > 0);
    return conCompetencias ? String(conCompetencias.idFicha) : fichas[0] ? String(fichas[0].idFicha) : "";
  }, [fichas, competenciasParaFicha]);

  const resetForm = () => {
    setEditingId(null);
    setNombreTema("");
    setFecha("");
    setHoraInicio("");
    setAmbienteId(ambientes[0] ? String(ambientes[0].idAmbiente) : "");
    const nextFichaId = primeraFichaConCompetencias();
    setFichaId(nextFichaId);
    const competencias = competenciasParaFicha(nextFichaId);
    setCursoId(competencias[0] ? String(competencias[0].idCurso) : "");
    setTrimestreId(trimestres[0] ? String(trimestres[0].idTrimestre) : "");
    setRepetirSemanal(false);
    setDiaSemana("1");
    setFieldErrors({});
    setFormSubmitted(false);
  };

  const getFormValues = (): ClaseFormValues => ({
    nombreTema,
    fecha,
    horaInicio,
    ambienteId,
    cursoId,
    fichaId,
    trimestreId,
    repetirSemanal,
    diaSemana,
    editingId
  });

  const getValidationContext = () => ({
    competenciasPorFicha: competenciasParaFicha,
    hasAmbientes: ambientes.length > 0,
    hasFichas: fichas.length > 0,
    hasTrimestres: trimestres.length > 0,
    trimestres
  });

  const trimestreSeleccionado = trimestres.find((t) => String(t.idTrimestre) === trimestreId);

  const clearFieldError = (field: ClaseFormField) => {
    if (!formSubmitted) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const showFieldError = (field: ClaseFormField) =>
    formSubmitted ? fieldErrors[field] : undefined;

  const inputClass = (field: ClaseFormField, base: string) =>
    showFieldError(field) ? `${base} ${styles.inputInvalid}` : base;

  const mapApiErrorToFieldErrors = (msg: string): ClaseFormErrors => {
    const errors: ClaseFormErrors = {};
    const lower = msg.toLowerCase();
    if (lower.includes("nombre") || lower.includes("tema")) errors.nombreTema = msg;
    else if (lower.includes("fecha")) errors.fecha = msg;
    else if (lower.includes("hora")) errors.horaInicio = msg;
    else if (lower.includes("ambiente")) errors.ambienteId = msg;
    else if (lower.includes("ficha")) errors.fichaId = msg;
    else if (lower.includes("competencia") || lower.includes("curso")) errors.cursoId = msg;
    else if (lower.includes("trimestre")) errors.trimestreId = msg;
    else if (lower.includes("dia")) errors.diaSemana = msg;
    return errors;
  };

  useEffect(() => {
    if (loading || editingId != null) return;
    if (ambienteId === "" && ambientes[0]) setAmbienteId(String(ambientes[0].idAmbiente));
    if (fichaId === "" && fichas.length > 0) setFichaId(primeraFichaConCompetencias());
    if (trimestreId === "" && trimestres[0]) setTrimestreId(String(trimestres[0].idTrimestre));
  }, [loading, editingId, ambientes, fichas, trimestres, ambienteId, fichaId, trimestreId, primeraFichaConCompetencias]);

  useEffect(() => {
    if (loading || !fichaId) return;

    const competencias = competenciasParaFicha(fichaId);
    if (competencias.length === 0) {
      if (cursoId !== "") setCursoId("");
      return;
    }

    const cursoValido = competencias.some((c) => String(c.idCurso) === cursoId);
    if (!cursoValido) {
      setCursoId(String(competencias[0].idCurso));
    }
  }, [loading, fichaId, cursoId, competenciasParaFicha]);

  const startEdit = (c: ClaseRow) => {
    setFieldErrors({});
    setFormSubmitted(false);
    setEditingId(c.idClase);
    setNombreTema(c.nombreTema ?? "");
    setFecha(toDateInputValue(c.fecha));
    setHoraInicio(toTimeInputValue(c.horaInicio));
    setAmbienteId(String(c.ambiente.idAmbiente));
    setCursoId(String(c.cursoCompetencia.idCurso));
    setFichaId(String(c.ficha.idFicha));
    setTrimestreId(c.trimestre ? String(c.trimestre.idTrimestre) : "");
    setRepetirSemanal(false);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    setFormSubmitted(true);

    const errors = validateClaseForm(getFormValues(), getValidationContext());
    setFieldErrors(errors);

    if (hasClaseFormErrors(errors)) {
      const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

    setSaving(true);
    const amb = Number.parseInt(ambienteId, 10);
    const cur = Number.parseInt(cursoId, 10);
    const fic = Number.parseInt(fichaId, 10);
    const trim = Number.parseInt(trimestreId, 10);
    const tema = nombreTema.trim();

    try {
      if (editingId != null) {
        await axios.put(`/api/instructor/clases/${editingId}`, {
          nombreTema: tema,
          fecha: fecha.trim(),
          horaInicio: horaInicio.trim(),
          ambienteIdAmbiente: amb,
          cursoCompetenciaIdCurso: cur,
          fichaIdFicha: fic,
          trimestreIdTrimestre: trim
        });
      } else {
        const { data } = await axios.post<{
          ok: boolean;
          totalCreadas?: number;
          error?: string;
        }>("/api/instructor/clases", {
          nombreTema: tema,
          fecha: repetirSemanal ? null : fecha.trim(),
          horaInicio: horaInicio.trim(),
          ambienteIdAmbiente: amb,
          cursoCompetenciaIdCurso: cur,
          fichaIdFicha: fic,
          trimestreIdTrimestre: trim,
          repetirSemanal,
          diaSemana: repetirSemanal ? Number.parseInt(diaSemana, 10) : null
        });
        if (data.ok && (data.totalCreadas ?? 0) > 1) {
          globalThis.alert(`Se crearon ${data.totalCreadas} sesiones semanales en el trimestre.`);
        }
      }
      resetForm();
      await load();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        typeof err.response.data.error === "string"
          ? err.response.data.error
          : null;
      const fallback = msg ?? "No se pudo guardar la clase";
      const fieldErrorsFromApi = msg ? mapApiErrorToFieldErrors(msg) : {};
      if (Object.keys(fieldErrorsFromApi).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...fieldErrorsFromApi }));
        setFormSubmitted(true);
        setError(null);
      } else {
        setError(fallback);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!globalThis.confirm("Eliminar esta clase y sus registros de asistencia asociados?")) return;
    setError(null);
    try {
      await axios.delete(`/api/instructor/clases/${id}`);
      if (editingId === id) resetForm();
      await load();
    } catch {
      setError("No se pudo eliminar la clase");
    }
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Gestion de clases</h1>
      <p className={styles.subtitle}>
        Asigne clases a un trimestre academico. Puede crear una sesion puntual o repetir la clase cada semana
        dentro del periodo del trimestre.
      </p>

      <section className={styles.formPanel} aria-labelledby="clase-form-titulo">
        <h2 id="clase-form-titulo" className={styles.formTitle}>
          {editingId != null ? `Editar clase #${editingId}` : "Nueva clase"}
        </h2>
        <form id="clase-form" noValidate onSubmit={(e) => void submit(e)}>
        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label} htmlFor="clase-nombre-tema">
              Nombre o tema de la clase
            </label>
            <input
              id="clase-nombre-tema"
              className={inputClass("nombreTema", styles.input)}
              value={nombreTema}
              onChange={(e) => {
                setNombreTema(e.target.value);
                clearFieldError("nombreTema");
              }}
              placeholder="Ej. Introduccion a bases de datos"
              maxLength={120}
              autoComplete="off"
              aria-invalid={showFieldError("nombreTema") ? true : undefined}
              aria-describedby={showFieldError("nombreTema") ? "clase-nombre-error" : undefined}
            />
            <FieldError
              id="clase-nombre-error"
              message={showFieldError("nombreTema") || undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clase-trimestre">
              Trimestre
            </label>
            <select
              id="clase-trimestre"
              className={inputClass("trimestreId", styles.select)}
              value={trimestreId}
              onChange={(e) => {
                setTrimestreId(e.target.value);
                clearFieldError("trimestreId");
                clearFieldError("fecha");
              }}
              aria-invalid={showFieldError("trimestreId") ? true : undefined}
              aria-describedby={showFieldError("trimestreId") ? "clase-trimestre-error" : undefined}
            >
              <option value="">Seleccione trimestre</option>
              {trimestres.map((t) => (
                <option key={t.idTrimestre} value={t.idTrimestre}>
                  {t.nombre} ({t.fechaInicio} — {t.fechaFin})
                </option>
              ))}
            </select>
            <FieldError
              id="clase-trimestre-error"
              message={showFieldError("trimestreId") || undefined}
            />
          </div>
          {editingId == null ? (
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={repetirSemanal}
                  onChange={(e) => {
                    setRepetirSemanal(e.target.checked);
                    clearFieldError("fecha");
                    clearFieldError("diaSemana");
                  }}
                  style={{ marginRight: "0.5rem" }}
                />
                Repetir cada semana durante el trimestre
              </label>
            </div>
          ) : null}
          {editingId == null && repetirSemanal ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="clase-dia">
                Dia de la semana
              </label>
              <select
                id="clase-dia"
                className={inputClass("diaSemana", styles.select)}
                value={diaSemana}
                onChange={(e) => {
                  setDiaSemana(e.target.value);
                  clearFieldError("diaSemana");
                }}
                aria-invalid={showFieldError("diaSemana") ? true : undefined}
                aria-describedby={showFieldError("diaSemana") ? "clase-dia-error" : undefined}
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <FieldError id="clase-dia-error" message={showFieldError("diaSemana") || undefined} />
              {trimestreSeleccionado ? (
                <p className={styles.loadingMuted} style={{ marginTop: "0.35rem" }}>
                  Se generaran sesiones los {DIAS_SEMANA.find((d) => d.value === diaSemana)?.label.toLowerCase()} entre{" "}
                  {trimestreSeleccionado.fechaInicio} y {trimestreSeleccionado.fechaFin}.
                </p>
              ) : null}
            </div>
          ) : (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="clase-fecha">
                Fecha
              </label>
              <input
                id="clase-fecha"
                type="date"
                className={inputClass("fecha", `${styles.input} ${styles.inputDate}`)}
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  clearFieldError("fecha");
                }}
                min={trimestreSeleccionado?.fechaInicio}
                max={trimestreSeleccionado?.fechaFin}
                autoComplete="off"
                aria-invalid={showFieldError("fecha") ? true : undefined}
                aria-describedby={showFieldError("fecha") ? "clase-fecha-error" : undefined}
              />
              <FieldError id="clase-fecha-error" message={showFieldError("fecha") || undefined} />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clase-hora">
              Hora inicio
            </label>
            <input
              id="clase-hora"
              type="time"
              className={inputClass("horaInicio", `${styles.input} ${styles.inputTime}`)}
              value={horaInicio}
              onChange={(e) => {
                setHoraInicio(e.target.value);
                clearFieldError("horaInicio");
              }}
              autoComplete="off"
              aria-invalid={showFieldError("horaInicio") ? true : undefined}
              aria-describedby={showFieldError("horaInicio") ? "clase-hora-error" : undefined}
            />
            <FieldError id="clase-hora-error" message={showFieldError("horaInicio") || undefined} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clase-ambiente">
              Ambiente
            </label>
            <select
              id="clase-ambiente"
              className={inputClass("ambienteId", styles.select)}
              value={ambienteId}
              onChange={(e) => {
                setAmbienteId(e.target.value);
                clearFieldError("ambienteId");
              }}
              aria-invalid={showFieldError("ambienteId") ? true : undefined}
              aria-describedby={showFieldError("ambienteId") ? "clase-ambiente-error" : undefined}
            >
              <option value="">Seleccione ambiente</option>
              {ambientes.map((a) => (
                <option key={a.idAmbiente} value={a.idAmbiente}>
                  {a.nombreAmbiente ?? `Ambiente ${a.idAmbiente}`}
                  {a.ubicacion ? ` · ${a.ubicacion}` : ""}
                </option>
              ))}
            </select>
            <FieldError
              id="clase-ambiente-error"
              message={showFieldError("ambienteId") || undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clase-curso">
              Competencia
            </label>
            <select
              id="clase-curso"
              className={inputClass("cursoId", styles.select)}
              value={cursoId}
              onChange={(e) => {
                setCursoId(e.target.value);
                clearFieldError("cursoId");
              }}
              disabled={!fichaId || competenciasParaFicha(fichaId).length === 0}
              aria-invalid={showFieldError("cursoId") ? true : undefined}
              aria-describedby={showFieldError("cursoId") ? "clase-curso-error" : undefined}
            >
              <option value="">
                {!fichaId
                  ? "Seleccione primero una ficha"
                  : competenciasParaFicha(fichaId).length === 0
                    ? "Sin competencias: el administrador debe asignarlas al programa de la ficha"
                    : "Seleccione competencia"}
              </option>
              {competenciasParaFicha(fichaId).map((c) => (
                <option key={c.idCurso} value={c.idCurso}>
                  {c.nombreCurso}
                </option>
              ))}
            </select>
            <FieldError id="clase-curso-error" message={showFieldError("cursoId") || undefined} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="clase-ficha">
              Ficha
            </label>
            <select
              id="clase-ficha"
              className={inputClass("fichaId", styles.select)}
              value={fichaId}
              onChange={(e) => {
                const nextFichaId = e.target.value;
                setFichaId(nextFichaId);
                clearFieldError("fichaId");
                clearFieldError("cursoId");
                const competencias = competenciasParaFicha(nextFichaId);
                setCursoId(competencias[0] ? String(competencias[0].idCurso) : "");
              }}
              aria-invalid={showFieldError("fichaId") ? true : undefined}
              aria-describedby={showFieldError("fichaId") ? "clase-ficha-error" : undefined}
            >
              <option value="">Seleccione ficha</option>
              {fichas.map((f) => (
                <option key={f.idFicha} value={f.idFicha}>
                  {f.numeroFicha ?? `Ficha ${f.idFicha}`}
                </option>
              ))}
            </select>
            <FieldError id="clase-ficha-error" message={showFieldError("fichaId") || undefined} />
          </div>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
            {editingId != null ? "Guardar cambios" : "Crear clase"}
          </button>
          {editingId != null ? (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} disabled={saving} onClick={resetForm}>
              Cancelar edicion
            </button>
          ) : null}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        </form>
      </section>

      {loading ? (
        <p className={styles.loadingMuted}>Cargando...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre / tema</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Ambiente</th>
                <th>Competencia</th>
                <th>Ficha</th>
                <th>Trimestre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clases.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ color: "#6b7280" }}>
                    No hay clases registradas.
                  </td>
                </tr>
              ) : (
                clases.map((c) => (
                  <tr key={c.idClase}>
                    <td>{c.idClase}</td>
                    <td>{c.nombreTema ?? "—"}</td>
                    <td>{c.fecha ?? "—"}</td>
                    <td>{c.horaInicio ?? "—"}</td>
                    <td>{c.ambiente.nombreAmbiente ?? c.ambiente.idAmbiente}</td>
                    <td>{c.cursoCompetencia.nombreCurso}</td>
                    <td>{c.ficha.numeroFicha ?? c.ficha.idFicha}</td>
                    <td>{c.trimestre?.nombre ?? "—"}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.rowBtn} onClick={() => startEdit(c)}>
                          Editar
                        </button>
                        <button type="button" className={`${styles.rowBtn} ${styles.rowBtnDanger}`} onClick={() => void remove(c.idClase)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
