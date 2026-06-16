"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiHash,
  FiInbox,
  FiMail,
  FiPhone,
  FiSend,
  FiUser,
  FiUsers,
  FiXCircle
} from "react-icons/fi";
import { QRCode } from "react-qr-code";
import styles from "./AprendizHome.module.css";

type Perfil = {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correoElectronico: string;
  telefono: string;
  numeroDocumento: string;
  usemame: string;
  qrCode: string | null;
  tipoDocumento: string | null;
};

type Clase = {
  idClase: number;
  nombreTema: string | null;
  fecha: string | null;
  horaInicio: string | null;
  competencia: string;
  ambiente: string | null;
};

type Instructor = {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correoElectronico: string;
  telefono: string;
};

type Asistencia = {
  idAsistencia: number;
  fecha: string | null;
  horaIngreso: string | null;
  horaFin: string | null;
  estado: string | null;
  clase: {
    idClase: number;
    nombreTema: string | null;
    fecha: string | null;
    horaInicio: string | null;
  };
};

type PortalData = {
  perfil: Perfil;
  ficha: {
    idFicha: number;
    numeroFicha: string | null;
    programa: {
      idProgramaFormacion: number;
      nombrePrograma: string;
      nivelFormacion: string;
    } | null;
  };
  clases: Clase[];
  instructores: Instructor[];
  asistencias: Asistencia[];
};

function estadoClass(estado: string | null | undefined) {
  const e = estado?.trim().toLowerCase() ?? "";
  if (e === "presente") return styles.estadoPresente;
  if (e === "tarde" || e === "tardanza") return styles.estadoTarde;
  if (e === "ausente") return styles.estadoAusente;
  return styles.estadoOtro;
}

function claseLabel(clase: { nombreTema: string | null; fecha: string | null; horaInicio: string | null }) {
  return [clase.nombreTema, clase.fecha, clase.horaInicio].filter(Boolean).join(" · ");
}

function initials(nombre: string, apellido: string) {
  const a = nombre.trim().charAt(0);
  const b = apellido.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function countByEstado(asistencias: Asistencia[], ...keys: string[]) {
  return asistencias.filter((a) => keys.includes(a.estado?.trim().toLowerCase() ?? "")).length;
}

function PanelHeader({
  id,
  title,
  barClass
}: {
  id: string;
  title: string;
  barClass?: string;
}) {
  return (
    <div className={styles.panelHeader}>
      <span className={barClass ? `${styles.sectionBar} ${barClass}` : styles.sectionBar} aria-hidden />
      <h2 id={id} className={styles.panelTitle}>
        {title}
      </h2>
    </div>
  );
}

export function AprendizHome() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingQr, setSendingQr] = useState(false);
  const [qrEmailMessage, setQrEmailMessage] = useState<string | null>(null);
  const [qrEmailError, setQrEmailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const { data: response } = await axios.get<{ ok: boolean; error?: string } & Partial<PortalData>>(
        "/api/aprendiz/perfil",
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }
      );

      if (!response.ok || !response.perfil) {
        setError(response.error ?? "No se pudo cargar tu información.");
        setData(null);
        return;
      }

      setData(response as PortalData);
    } catch {
      setError("No se pudo cargar tu información. Verifica tu sesión.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendQrByEmail = async () => {
    setSendingQr(true);
    setQrEmailMessage(null);
    setQrEmailError(null);

    try {
      const token = localStorage.getItem("token");
      const { data: response } = await axios.post<{ ok: boolean; message?: string; error?: string }>(
        "/api/aprendiz/perfil/enviar-qr",
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }
      );

      if (!response.ok) {
        setQrEmailError(response.error ?? "No se pudo enviar el correo.");
        return;
      }

      setQrEmailMessage(response.message ?? "Código QR enviado a tu correo.");
    } catch {
      setQrEmailError("No se pudo enviar el correo. Intenta de nuevo más tarde.");
    } finally {
      setSendingQr(false);
    }
  };

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      clases: data.clases.length,
      instructores: data.instructores.length,
      presentes: countByEstado(data.asistencias, "presente"),
      tardes: countByEstado(data.asistencias, "tarde", "tardanza"),
      ausentes: countByEstado(data.asistencias, "ausente")
    };
  }, [data]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.loadingWrap}>
            <div className={styles.loadingSpinner} aria-hidden />
            <p className={styles.loading}>Cargando tu panel...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data || !stats) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>Panel del aprendiz</p>
            <h1 className={styles.heading}>Mi panel</h1>
          </header>
          <p className={styles.error} role="alert">
            {error ?? "No hay datos disponibles."}
          </p>
        </div>
      </main>
    );
  }

  const { perfil, ficha, clases, instructores, asistencias } = data;
  const fullName = `${perfil.nombre} ${perfil.apellido}`.trim();
  const qrValue = perfil.qrCode?.trim() ?? "";

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Panel del aprendiz</p>
          <h1 className={styles.heading}>
            Hola, <span className={styles.headingAccent}>{perfil.nombre}</span>
          </h1>
          <p className={styles.subtitle}>
            Aquí tienes tu información personal, tu código QR de asistencia, las clases de tu ficha y
            tu historial formativo.
          </p>
          <p className={styles.welcome}>
            Sesión iniciada como <strong>{fullName}</strong>
            {ficha.numeroFicha ? (
              <>
                {" "}
                · Ficha <strong>{ficha.numeroFicha}</strong>
              </>
            ) : null}
          </p>
        </header>

        <div className={styles.statsRow} aria-label="Resumen rápido">
          <div className={styles.statCard}>
            <span className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
              <FiCalendar className={styles.statIcon} aria-hidden />
            </span>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{stats.clases}</span>
              <span className={styles.statLabel}>Clases</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIconWrap} ${styles.statIconViolet}`}>
              <FiUsers className={styles.statIcon} aria-hidden />
            </span>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{stats.instructores}</span>
              <span className={styles.statLabel}>Instructores</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
              <FiCheckCircle className={styles.statIcon} aria-hidden />
            </span>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{stats.presentes}</span>
              <span className={styles.statLabel}>Presente</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
              <FiClock className={styles.statIcon} aria-hidden />
            </span>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{stats.tardes}</span>
              <span className={styles.statLabel}>Tarde</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
              <FiXCircle className={styles.statIcon} aria-hidden />
            </span>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{stats.ausentes}</span>
              <span className={styles.statLabel}>Ausente</span>
            </div>
          </div>
        </div>

        <div className={styles.gridTop}>
          <section className={styles.panel} aria-labelledby="perfil-title">
            <PanelHeader id="perfil-title" title="Mis datos" />
            <div className={styles.profileTop}>
              <div className={styles.avatar} aria-hidden>
                {initials(perfil.nombre, perfil.apellido)}
              </div>
              <div className={styles.profileMeta}>
                <p className={styles.profileName}>{fullName}</p>
                <p className={styles.profileUser}>@{perfil.usemame}</p>
              </div>
            </div>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <span className={styles.dataIconWrap}>
                  <FiHash className={styles.dataIcon} aria-hidden />
                </span>
                <div className={styles.dataContent}>
                  <span className={styles.dataLabel}>Documento</span>
                  <span className={styles.dataValue}>
                    {perfil.tipoDocumento ? `${perfil.tipoDocumento} ` : ""}
                    {perfil.numeroDocumento}
                  </span>
                </div>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataIconWrap}>
                  <FiMail className={styles.dataIcon} aria-hidden />
                </span>
                <div className={styles.dataContent}>
                  <span className={styles.dataLabel}>Correo</span>
                  <span className={styles.dataValue}>{perfil.correoElectronico}</span>
                </div>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataIconWrap}>
                  <FiPhone className={styles.dataIcon} aria-hidden />
                </span>
                <div className={styles.dataContent}>
                  <span className={styles.dataLabel}>Teléfono</span>
                  <span className={styles.dataValue}>{perfil.telefono}</span>
                </div>
              </div>
              <div className={styles.dataItem}>
                <span className={styles.dataIconWrap}>
                  <FiUser className={styles.dataIcon} aria-hidden />
                </span>
                <div className={styles.dataContent}>
                  <span className={styles.dataLabel}>Usuario</span>
                  <span className={styles.dataValue}>{perfil.usemame}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.qrPanel}`} aria-labelledby="qr-title">
            <PanelHeader id="qr-title" title="Código QR de asistencia" barClass={styles.sectionBarViolet} />
            <div className={styles.qrPanelInner}>
              {qrValue ? (
                <>
                  <span className={styles.qrBadge}>
                    <FiHash aria-hidden />
                    Identificador personal
                  </span>
                  <div className={styles.qrWrap}>
                    <QRCode
                      size={200}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      value={qrValue}
                      viewBox="0 0 256 256"
                    />
                  </div>
                  <p className={styles.qrCodeText}>{qrValue}</p>
                  <p className={styles.qrHint}>
                    Presenta este código al instructor para registrar tu asistencia en clase.
                  </p>
                  <button
                    type="button"
                    className={styles.qrEmailButton}
                    onClick={() => void sendQrByEmail()}
                    disabled={sendingQr}
                  >
                    <FiSend aria-hidden />
                    {sendingQr ? "Enviando..." : "Enviar QR a mi correo"}
                  </button>
                  {qrEmailMessage ? (
                    <p className={styles.qrEmailSuccess} role="status">
                      {qrEmailMessage}
                    </p>
                  ) : null}
                  {qrEmailError ? (
                    <p className={styles.qrEmailError} role="alert">
                      {qrEmailError}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className={styles.empty}>
                  <FiInbox className={styles.emptyIcon} aria-hidden />
                  Aún no tienes un código QR asignado.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className={`${styles.panel} ${styles.section}`} aria-labelledby="ficha-title">
          <PanelHeader id="ficha-title" title="Mi ficha" barClass={styles.sectionBarViolet} />
          <div className={styles.fichaGrid}>
            <div className={styles.fichaChip}>
              <span className={styles.fichaChipLabel}>Número de ficha</span>
              <span className={styles.fichaChipValue}>{ficha.numeroFicha ?? ficha.idFicha}</span>
            </div>
            {ficha.programa ? (
              <>
                <div className={styles.fichaChip}>
                  <span className={styles.fichaChipLabel}>Programa</span>
                  <span className={styles.fichaChipValue}>{ficha.programa.nombrePrograma}</span>
                </div>
                <div className={styles.fichaChip}>
                  <span className={styles.fichaChipLabel}>Nivel</span>
                  <span className={styles.fichaChipValue}>{ficha.programa.nivelFormacion}</span>
                </div>
              </>
            ) : (
              <div className={styles.fichaChip}>
                <span className={styles.fichaChipLabel}>Programa</span>
                <span className={styles.fichaChipValue}>No asignado</span>
              </div>
            )}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.section}`} aria-labelledby="clases-title">
          <PanelHeader id="clases-title" title="Clases de mi ficha" />
          {clases.length === 0 ? (
            <p className={styles.empty}>
              <FiBookOpen className={styles.emptyIcon} aria-hidden />
              No hay clases registradas para tu ficha.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Tema</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Hora</th>
                    <th scope="col">Competencia</th>
                    <th scope="col">Ambiente</th>
                  </tr>
                </thead>
                <tbody>
                  {clases.map((clase) => (
                    <tr key={clase.idClase}>
                      <td>{clase.nombreTema ?? "—"}</td>
                      <td>{clase.fecha ?? "—"}</td>
                      <td>{clase.horaInicio ?? "—"}</td>
                      <td>{clase.competencia}</td>
                      <td>{clase.ambiente ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.panel} ${styles.section}`} aria-labelledby="instructores-title">
          <PanelHeader
            id="instructores-title"
            title="Instructores asociados"
            barClass={styles.sectionBarGreen}
          />
          {instructores.length === 0 ? (
            <p className={styles.empty}>
              <FiUsers className={styles.emptyIcon} aria-hidden />
              No hay instructores asignados a tu ficha.
            </p>
          ) : (
            <ul className={styles.instructorList} role="list">
              {instructores.map((instructor) => (
                <li key={instructor.idUsuario} className={styles.instructorCard}>
                  <div className={styles.instructorAvatar} aria-hidden>
                    {initials(instructor.nombre, instructor.apellido)}
                  </div>
                  <div className={styles.instructorBody}>
                    <p className={styles.instructorName}>
                      {instructor.nombre} {instructor.apellido}
                    </p>
                    <p className={styles.instructorDetail}>
                      <FiMail className={styles.instructorDetailIcon} aria-hidden />
                      {instructor.correoElectronico}
                    </p>
                    <p className={styles.instructorDetail}>
                      <FiPhone className={styles.instructorDetailIcon} aria-hidden />
                      {instructor.telefono}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${styles.panel} ${styles.section}`} aria-labelledby="asistencias-title">
          <PanelHeader id="asistencias-title" title="Historial de asistencia" barClass={styles.sectionBarGreen} />
          {asistencias.length === 0 ? (
            <p className={styles.empty}>
              <FiCalendar className={styles.emptyIcon} aria-hidden />
              Aún no tienes registros de asistencia.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Clase</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Ingreso</th>
                    <th scope="col">Salida</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencias.map((registro) => (
                    <tr key={registro.idAsistencia}>
                      <td>{claseLabel(registro.clase)}</td>
                      <td>{registro.fecha ?? registro.clase.fecha ?? "—"}</td>
                      <td>{registro.horaIngreso ?? "—"}</td>
                      <td>{registro.horaFin ?? "—"}</td>
                      <td>
                        <span className={`${styles.estado} ${estadoClass(registro.estado)}`}>
                          {registro.estado ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
