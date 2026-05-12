"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { InstructorAttendanceQrScanner } from "./InstructorAttendanceQrScanner";
import styles from "./InstructorHomeFilters.module.css";

type Programa = { idProgramaFormacion: number; nombrePrograma: string };
type Competencia = { idCurso: number; nombreCurso: string };
type Ficha = { idFicha: number; numeroFicha: string | null };
type Clase = {
  idClase: number;
  fecha: string | null;
  horaInicio: string | null;
  ambiente: { nombreAmbiente: string | null };
};

type AsistenciaRow = {
  idAsistencia: number;
  fecha: string | null;
  horaIngreso: string | null;
  estado: string | null;
  idAprendiz: string | null;
  aprendizNombre: string | null;
  documentoAprendiz: string | null;
};

function estadoClass(estado: string | null | undefined) {
  const e = estado?.trim().toLowerCase() ?? "";
  if (e === "presente") return styles.estadoPresente;
  if (e === "tarde" || e === "tardanza") return styles.estadoTarde;
  if (e === "ausente") return styles.estadoAusente;
  return styles.estadoOtro;
}

export function InstructorHomeFilters() {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);

  const [programaId, setProgramaId] = useState("");
  const [competenciaId, setCompetenciaId] = useState("");
  const [fichaId, setFichaId] = useState("");
  const [claseId, setClaseId] = useState("");

  const [asistencias, setAsistencias] = useState<AsistenciaRow[]>([]);

  const [loadingProgramas, setLoadingProgramas] = useState(true);
  const [loadingRelaciones, setLoadingRelaciones] = useState(false);
  const [loadingClases, setLoadingClases] = useState(false);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProgramas(true);
      setError(null);
      try {
        const { data } = await axios.get<{ ok: boolean; programas?: Programa[] }>(
          "/api/instructor/filtros?tipo=programas"
        );
        if (cancelled) return;
        if (data.ok && data.programas) setProgramas(data.programas);
        else setError("No se pudieron cargar los programas");
      } catch {
        if (!cancelled) setError("No se pudieron cargar los programas");
      } finally {
        if (!cancelled) setLoadingProgramas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCompetenciasYFichas = useCallback(async (pid: string) => {
    if (!pid) {
      setCompetencias([]);
      setFichas([]);
      return;
    }
    setLoadingRelaciones(true);
    setError(null);
    try {
      const [compRes, fichasRes] = await Promise.all([
        axios.get<{ ok: boolean; competencias?: Competencia[] }>(
          `/api/instructor/filtros?tipo=competencias&programaId=${encodeURIComponent(pid)}`
        ),
        axios.get<{ ok: boolean; fichas?: Ficha[] }>(
          `/api/instructor/filtros?tipo=fichas&programaId=${encodeURIComponent(pid)}`
        )
      ]);
      if (compRes.data.ok && compRes.data.competencias) {
        setCompetencias(compRes.data.competencias);
      } else {
        setCompetencias([]);
      }
      if (fichasRes.data.ok && fichasRes.data.fichas) {
        setFichas(fichasRes.data.fichas);
      } else {
        setFichas([]);
      }
    } catch {
      setError("No se pudieron cargar competencias o fichas");
      setCompetencias([]);
      setFichas([]);
    } finally {
      setLoadingRelaciones(false);
    }
  }, []);

  const onProgramaChange = (value: string) => {
    setProgramaId(value);
    setCompetenciaId("");
    setFichaId("");
    setClaseId("");
    setScannerOpen(false);
    setClases([]);
    setAsistencias([]);
    if (!value) {
      setCompetencias([]);
      setFichas([]);
      return;
    }
    void loadCompetenciasYFichas(value);
  };

  const onCompetenciaChange = (value: string) => {
    setCompetenciaId(value);
    setClaseId("");
    setScannerOpen(false);
    setClases([]);
    setAsistencias([]);
  };

  const onFichaChange = (value: string) => {
    setFichaId(value);
    setClaseId("");
    setScannerOpen(false);
    setClases([]);
    setAsistencias([]);
  };

  const loadAsistencias = useCallback(async (selectedClaseId: string) => {
    if (!selectedClaseId) {
      setAsistencias([]);
      return;
    }

    setLoadingAsistencias(true);
    setAsistencias([]);
    setError(null);
    try {
      const { data } = await axios.get<{
        ok: boolean;
        asistencias?: AsistenciaRow[];
      }>(`/api/instructor/filtros?tipo=asistencias&claseId=${encodeURIComponent(selectedClaseId)}`);
      if (data.ok && data.asistencias) setAsistencias(data.asistencias);
      else setAsistencias([]);
    } catch {
      setError("No se pudo cargar la asistencia de la clase");
      setAsistencias([]);
    } finally {
      setLoadingAsistencias(false);
    }
  }, []);

  const onClaseChange = (value: string) => {
    setClaseId(value);
    setScannerOpen(false);
  };

  const handleAttendanceRegistered = useCallback(async () => {
    if (!claseId) return;
    await loadAsistencias(claseId);
  }, [claseId, loadAsistencias]);

  useEffect(() => {
    if (!fichaId || !competenciaId) {
      setClases([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingClases(true);
      setError(null);
      try {
        const { data } = await axios.get<{ ok: boolean; clases?: Clase[] }>(
          `/api/instructor/filtros?tipo=clases&fichaId=${encodeURIComponent(fichaId)}&competenciaId=${encodeURIComponent(competenciaId)}`
        );
        if (cancelled) return;
        if (data.ok && data.clases) setClases(data.clases);
        else setClases([]);
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar las clases");
          setClases([]);
        }
      } finally {
        if (!cancelled) setLoadingClases(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fichaId, competenciaId]);

  useEffect(() => {
    if (!claseId) {
      setAsistencias([]);
      setScannerOpen(false);
      return;
    }
    void loadAsistencias(claseId);
  }, [claseId, loadAsistencias]);

  const programaNombre = programas.find((p) => String(p.idProgramaFormacion) === programaId)
    ?.nombrePrograma;
  const competenciaNombre = competencias.find((c) => String(c.idCurso) === competenciaId)?.nombreCurso;
  const fichaNumero = fichas.find((f) => String(f.idFicha) === fichaId)?.numeroFicha ?? fichaId;
  const claseSeleccionada = clases.find((c) => String(c.idClase) === claseId);

  const disableCompetenciaFicha =
    !programaId || loadingProgramas || loadingRelaciones;
  const disableClase = !fichaId || !competenciaId || loadingClases;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Gestion de asistencia</h1>
      <p className={styles.subtitle}>
        Consulte el registro de asistencia eligiendo programa de formacion, competencia, ficha y clase.
      </p>

      <section
        id="instructor-filtros"
        className={styles.panel}
        aria-labelledby="filtros-titulo"
      >
        <h2 id="filtros-titulo" className={styles.panelTitle}>
          Filtros de consulta
        </h2>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="filtro-programa">
              Programa de formacion
            </label>
            <select
              id="filtro-programa"
              className={styles.select}
              value={programaId}
              onChange={(e) => onProgramaChange(e.target.value)}
              disabled={loadingProgramas}
            >
              <option value="">
                {loadingProgramas ? "Cargando..." : "Seleccione un programa"}
              </option>
              {programas.map((p) => (
                <option key={p.idProgramaFormacion} value={p.idProgramaFormacion}>
                  {p.nombrePrograma}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="filtro-competencia">
              Competencia
            </label>
            <select
              id="filtro-competencia"
              className={styles.select}
              value={competenciaId}
              onChange={(e) => onCompetenciaChange(e.target.value)}
              disabled={disableCompetenciaFicha}
            >
              <option value="">
                {!programaId
                  ? "Seleccione primero un programa"
                  : loadingRelaciones
                    ? "Cargando..."
                    : "Seleccione una competencia"}
              </option>
              {competencias.map((c) => (
                <option key={c.idCurso} value={c.idCurso}>
                  {c.nombreCurso}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="filtro-ficha">
              Ficha
            </label>
            <select
              id="filtro-ficha"
              className={styles.select}
              value={fichaId}
              onChange={(e) => onFichaChange(e.target.value)}
              disabled={disableCompetenciaFicha}
            >
              <option value="">
                {!programaId
                  ? "Seleccione primero un programa"
                  : loadingRelaciones
                    ? "Cargando..."
                    : "Seleccione una ficha"}
              </option>
              {fichas.map((f) => (
                <option key={f.idFicha} value={f.idFicha}>
                  {f.numeroFicha ?? `Ficha ${f.idFicha}`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="filtro-clase">
              Clase
            </label>
            <select
              id="filtro-clase"
              className={styles.select}
              value={claseId}
              onChange={(e) => onClaseChange(e.target.value)}
              disabled={disableClase}
            >
              <option value="">
                {!fichaId || !competenciaId
                  ? "Seleccione ficha y competencia"
                  : loadingClases
                    ? "Cargando..."
                    : "Seleccione una clase"}
              </option>
              {clases.map((c) => (
                <option key={c.idClase} value={c.idClase}>
                  {[
                    c.fecha ?? "Sin fecha",
                    c.horaInicio ?? "",
                    c.ambiente.nombreAmbiente ? `· ${c.ambiente.nombreAmbiente}` : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {programaId && competenciaId && fichaId ? (
          <p className={styles.summary}>
            Clase para consultar asistencia:{" "}
            <strong>{programaNombre ?? programaId}</strong>
            {" · "}
            <strong>{competenciaNombre ?? competenciaId}</strong>
            {" · "}
            Ficha <strong>{fichaNumero}</strong>
            {claseId && claseSeleccionada ? (
              <>
                {" · "}
                Clase <strong>#{claseSeleccionada.idClase}</strong>
                {claseSeleccionada.fecha ? ` (${claseSeleccionada.fecha})` : ""}
              </>
            ) : null}
          </p>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {claseId && claseSeleccionada ? (
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.scanButton}
              onClick={() => setScannerOpen((current) => !current)}
              aria-expanded={scannerOpen}
            >
              {scannerOpen ? "Ocultar escaner QR" : "Escanear QR de aprendices"}
            </button>
          </div>
        ) : null}

        {scannerOpen && claseSeleccionada ? (
          <div className={styles.scannerWrap}>
            <InstructorAttendanceQrScanner
              claseId={claseSeleccionada.idClase}
              claseLabel={`Clase #${claseSeleccionada.idClase}${
                claseSeleccionada.fecha ? ` · ${claseSeleccionada.fecha}` : ""
              }`}
              onAttendanceRegistered={handleAttendanceRegistered}
              onClose={() => setScannerOpen(false)}
            />
          </div>
        ) : null}
      </section>

      <section
        id="instructor-asistencias"
        className={styles.asistenciasPanel}
        aria-labelledby="asistencias-titulo"
      >
        <h2 id="asistencias-titulo" className={styles.asistenciasTitle}>
          Asistencia registrada en la clase
        </h2>

        {!claseId ? (
          <p className={styles.hint}>
            Seleccione una clase en los filtros anteriores para ver la asistencia.
          </p>
        ) : (
          <>
            {claseSeleccionada ? (
              <p className={styles.asistenciasMeta}>
                Clase #{claseSeleccionada.idClase}
                {claseSeleccionada.fecha ? ` · ${claseSeleccionada.fecha}` : ""}
                {claseSeleccionada.horaInicio ? ` · ${claseSeleccionada.horaInicio}` : ""}
                {claseSeleccionada.ambiente.nombreAmbiente
                  ? ` · ${claseSeleccionada.ambiente.nombreAmbiente}`
                  : ""}
              </p>
            ) : null}

            {loadingAsistencias ? (
              <p className={styles.loadingMuted}>Cargando registro de asistencia...</p>
            ) : asistencias.length === 0 ? (
              <p className={styles.emptyMuted}>
                No hay asistencia registrada para esta clase.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Aprendiz</th>
                      <th scope="col">Documento</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Hora ingreso</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencias.map((a) => (
                      <tr key={a.idAsistencia}>
                        <td>{a.aprendizNombre ?? a.idAprendiz ?? "—"}</td>
                        <td>{a.documentoAprendiz ?? "—"}</td>
                        <td>{a.fecha ?? "—"}</td>
                        <td>{a.horaIngreso ?? "—"}</td>
                        <td>
                          {a.estado ? (
                            <span className={`${styles.estado} ${estadoClass(a.estado)}`}>
                              {a.estado}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
