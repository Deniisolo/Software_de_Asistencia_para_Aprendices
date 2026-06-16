import nodemailer from "nodemailer";
import QRCode from "qrcode";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim() && process.env.SMTP_HOST?.trim()
  );
}

function createTransporter() {
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || ""
    }
  });
}

async function qrToDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M"
  });
}

export type AprendizQrEmailParams = {
  to: string;
  nombre: string;
  apellido: string;
  qrPayload: string;
};

type QrEmailTemplate = {
  subject: string;
  badge: string;
  intro: string;
};

function buildQrEmailHtml(
  template: QrEmailTemplate,
  nombreSafe: string,
  apellidoSafe: string,
  qrSafe: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:Segoe UI,Tahoma,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f4;">
  <div style="background:#fff;padding:30px;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.08);">
    <div style="text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:20px;border-radius:10px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;">Software de Asistencia para Aprendices</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">${template.badge}</p>
    </div>
    <p>Hola <strong>${nombreSafe} ${apellidoSafe}</strong>,</p>
    <p>${template.intro}</p>
    <div style="text-align:center;background:#f8f9fa;padding:20px;border-radius:10px;margin:20px 0;">
      <h3 style="margin-top:0;">Tu código QR</h3>
      <img src="cid:qr-image" alt="Código QR" style="max-width:200px;height:auto;border:3px solid #667eea;border-radius:10px;margin:12px 0;">
      <p style="margin:12px 0 6px;"><strong>Valor del código:</strong></p>
      <div style="background:#e9ecef;padding:10px;border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all;">${qrSafe}</div>
      <p style="font-size:13px;color:#555;margin-top:12px;">También adjuntamos la imagen del QR en este correo.</p>
    </div>
    <div style="background:#e7f3ff;border-left:4px solid #2196F3;padding:14px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Importante</strong></p>
      <ul style="margin:0;padding-left:20px;">
        <li>Conserva este código: es tu identificador para asistencia.</li>
        <li>No lo compartas con otras personas.</li>
        <li>Presenta el QR en clase según indique tu instructor.</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#666;margin-top:24px;">Este mensaje es automático. Por favor no respondas a este correo.</p>
  </div>
</body>
</html>`;
}

async function sendAprendizQrEmailInternal(
  params: AprendizQrEmailParams,
  template: QrEmailTemplate
): Promise<boolean> {
  const { to, nombre, apellido, qrPayload } = params;
  const dest = to?.trim();
  const nombreSafe = escapeHtml(nombre.trim());
  const apellidoSafe = escapeHtml(apellido.trim());
  const qrSafe = escapeHtml(qrPayload);
  if (!dest) {
    console.warn("[aprendiz-email] Sin correo destino; no se envia QR");
    return false;
  }
  if (!smtpConfigured()) {
    console.warn(
      "[aprendiz-email] SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS); no se envia correo con QR"
    );
    return false;
  }

  try {
    const transporter = createTransporter();

    const qrImageData = await qrToDataUrl(qrPayload);
    const base64 = qrImageData.includes(",") ? qrImageData.split(",")[1] : qrImageData;

    const fromAddr = process.env.SMTP_USER!.trim();

    await transporter.sendMail({
      from: `"Software de Asistencia para Aprendices" <${fromAddr}>`,
      to: dest,
      subject: template.subject,
      html: buildQrEmailHtml(template, nombreSafe, apellidoSafe, qrSafe),
      attachments: [
        {
          filename: `qr-${nombre.trim()}-${apellido.trim()}.png`.replace(/[/\\?%*:|"<>\\s]+/g, "_"),
          content: base64,
          encoding: "base64",
          cid: "qr-image"
        }
      ]
    });

    return true;
  } catch (e) {
    console.error("[aprendiz-email] Error enviando correo con QR:", e);
    return false;
  }
}

/**
 * Envía al aprendiz su código QR por correo (misma convención SMTP que SAA2: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
 * No lanza: los errores se registran en consola para no revertir el alta del usuario.
 */
export async function sendAprendizQrWelcomeEmail(params: AprendizQrEmailParams): Promise<boolean> {
  return sendAprendizQrEmailInternal(params, {
    subject: `Tu codigo QR de asistencia — ${params.nombre.trim()}`,
    badge: "Registro de aprendiz",
    intro:
      "Tu registro fue exitoso. A continuación tienes tu <strong>código QR personal</strong>, el mismo que está guardado en el sistema para marcar asistencia."
  });
}

/** Reenvío del QR solicitado desde el panel del aprendiz. */
export async function sendAprendizQrResendEmail(params: AprendizQrEmailParams): Promise<boolean> {
  return sendAprendizQrEmailInternal(params, {
    subject: `Tu codigo QR de asistencia — ${params.nombre.trim()}`,
    badge: "Codigo QR de asistencia",
    intro:
      "Solicitaste recibir tu <strong>código QR personal</strong> por correo. A continuación lo encontrarás junto con su valor en texto."
  });
}
