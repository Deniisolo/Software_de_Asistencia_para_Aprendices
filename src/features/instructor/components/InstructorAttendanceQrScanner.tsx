"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import axios from "axios";
import QrScanner from "qr-scanner";
import styles from "./InstructorAttendanceQrScanner.module.css";

type EstadoAsistencia = "presente" | "tarde" | "ausente";

type RegistroReciente = {
  idAsistencia: number;
  aprendizNombre: string;
  documentoAprendiz: string;
  estado: EstadoAsistencia;
  horaIngreso: string | null;
};

type ScannerMessage = {
  type: "info" | "success" | "error";
  text: string;
};

type Props = {
  claseId: number;
  claseLabel: string;
  onAttendanceRegistered: () => Promise<void> | void;
  onClose: () => void;
};

function badgeClass(estado: EstadoAsistencia) {
  if (estado === "presente") return `${styles.badge} ${styles.badgePresente}`;
  if (estado === "tarde") return `${styles.badge} ${styles.badgeTarde}`;
  return `${styles.badge} ${styles.badgeAusente}`;
}

export function InstructorAttendanceQrScanner({
  claseId,
  claseLabel,
  onAttendanceRegistered,
  onClose
}: Props) {
  const titleId = `qr-title-${useId().replace(/:/g, "")}`;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const scannerRunIdRef = useRef(0);
  const isProcessingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const onAttendanceRegisteredRef = useRef(onAttendanceRegistered);

  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState<ScannerMessage | null>(null);
  const [recentScans, setRecentScans] = useState<RegistroReciente[]>([]);

  useEffect(() => {
    onAttendanceRegisteredRef.current = onAttendanceRegistered;
  }, [onAttendanceRegistered]);

  const clearScanner = useCallback(async () => {
    scannerRunIdRef.current += 1;
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Ignoramos errores de cierre del stream.
    }

    try {
      scanner.destroy();
    } catch {
      // Ignoramos errores al destruir el escaner.
    } finally {
      scannerRef.current = null;
    }
  }, []);

  const stopScanner = useCallback(async () => {
    await clearScanner();
    setIsScanning(false);
  }, [clearScanner]);

  const processCode = useCallback(
    async (rawCode: string) => {
      const qrCode = rawCode.trim();
      if (!qrCode) return;
      if (isProcessingRef.current) return;

      const now = Date.now();
      const lastScan = lastScanRef.current;
      if (lastScan && lastScan.code === qrCode && now - lastScan.at < 2500) {
        return;
      }

      lastScanRef.current = { code: qrCode, at: now };
      isProcessingRef.current = true;
      setIsProcessing(true);
      setMessage({ type: "info", text: "Procesando codigo QR..." });

      try {
        const { data } = await axios.post<{
          ok: boolean;
          asistencia?: RegistroReciente;
          error?: string;
        }>("/api/instructor/asistencias", {
          claseId,
          qrCode
        });

        if (!data.ok || !data.asistencia) {
          setMessage({
            type: "error",
            text: data.error ?? "No se pudo registrar la asistencia."
          });
          return;
        }

        setRecentScans((current) => [data.asistencia!, ...current].slice(0, 6));
        setManualCode("");
        setMessage({
          type: "success",
          text: `${data.asistencia.aprendizNombre} registrado como ${data.asistencia.estado}.`
        });
        await onAttendanceRegisteredRef.current();
      } catch (error) {
        const msg =
          axios.isAxiosError(error) &&
          error.response?.data &&
          typeof error.response.data === "object" &&
          "error" in error.response.data &&
          typeof error.response.data.error === "string"
            ? error.response.data.error
            : "No se pudo registrar la asistencia.";

        setMessage({ type: "error", text: msg });
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [claseId]
  );

  const startScanner = useCallback(async () => {
    await clearScanner();
    const runId = scannerRunIdRef.current;
    setMessage(null);
    setIsScanning(false);

    try {
      const video = videoRef.current;
      if (!video) {
        setMessage({ type: "error", text: "No se pudo montar la vista de la camara." });
        return;
      }

      const scanner = new QrScanner(
        video,
        (result) => {
          const value = typeof result === "string" ? result : result.data;
          void processCode(value);
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 5,
          highlightScanRegion: false,
          highlightCodeOutline: false,
          returnDetailedScanResult: true
        }
      );

      scannerRef.current = scanner;
      await scanner.start();

      if (scannerRunIdRef.current !== runId) {
        await clearScanner();
        return;
      }

      setIsScanning(true);
    } catch {
      await clearScanner();
      setIsScanning(false);
      setMessage({
        type: "error",
        text: "No fue posible iniciar la camara. Puedes usar la entrada manual."
      });
    }
  }, [clearScanner, processCode]);

  useEffect(() => {
    void startScanner();
    return () => {
      void clearScanner();
    };
  }, [clearScanner, startScanner]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div>
          <h3 id={titleId} className={styles.title}>
            Escaner QR de aprendices
          </h3>
          <p className={styles.subtitle}>
            Escanea los codigos QR para registrar asistencia en {claseLabel}.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => void startScanner()}
            disabled={isProcessing}
          >
            Reiniciar camara
          </button>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => {
              void stopScanner();
              onClose();
            }}
          >
            Cerrar escaner
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={`${styles.status} ${
            message.type === "success"
              ? styles.statusSuccess
              : message.type === "error"
                ? styles.statusError
                : styles.statusInfo
          }`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      <div className={styles.scannerArea}>
        <div className={styles.readerWrap}>
          <video ref={videoRef} className={styles.readerVideo} muted playsInline />
          {!isScanning ? (
            <div className={styles.placeholder}>
              <p>Activa la camara o usa la entrada manual para registrar la asistencia.</p>
            </div>
          ) : null}
        </div>

        <div className={styles.sideCard}>
          <h4 className={styles.sideTitle}>Entrada manual</h4>
          <div className={styles.fieldGroup}>
            <input
              type="text"
              className={styles.input}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Pega aqui el codigo QR"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void processCode(manualCode);
                }
              }}
            />
            <button
              type="button"
              className={styles.button}
              onClick={() => void processCode(manualCode)}
              disabled={!manualCode.trim() || isProcessing}
            >
              Registrar codigo
            </button>
          </div>
          <p className={styles.helper}>
            Si la camara no abre o no detecta el QR, puedes pegar el codigo manualmente.
          </p>

          <h4 className={styles.sideTitle}>Ultimos registros de esta sesion</h4>
          {recentScans.length === 0 ? (
            <p className={styles.helper}>Aun no se han registrado asistencias en esta sesion.</p>
          ) : (
            <ul className={styles.recentList}>
              {recentScans.map((item) => (
                <li key={item.idAsistencia} className={styles.recentItem}>
                  <div className={styles.recentTop}>
                    <span className={styles.recentName}>{item.aprendizNombre}</span>
                    <span className={badgeClass(item.estado)}>{item.estado}</span>
                  </div>
                  <p className={styles.recentMeta}>
                    {item.documentoAprendiz} {item.horaIngreso ? `· ${item.horaIngreso}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
