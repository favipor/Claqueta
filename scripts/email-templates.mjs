// Plantillas de los correos de Supabase (confirmar cuenta, recuperar contraseña, enlace de acceso, cambio de email).
// HTML con tablas y estilos en línea: es lo que Gmail, Outlook y Hotmail muestran igual.
//
//   node scripts/email-templates.mjs --apply           sube las plantillas a Supabase (necesita SUPABASE_ACCESS_TOKEN)
//   node scripts/email-templates.mjs --preview EMAIL   envía una muestra con Resend (usa RESEND_API_KEY de .env.local)
import fs from "node:fs";

const SITE = "https://miclaqueta.com";
const LOGO = `${SITE}/apple-icon.png`;
const PROJECT = "dgeviliomsuklkvbgmcv";

export function template({ preheader, title, text, button, url, note }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2f1" style="background:#eef2f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <!-- Cabecera -->
      <tr><td align="center" bgcolor="#0f766e" style="background:#0f766e;background-image:linear-gradient(135deg,#14b8a6,#0f766e 55%,#134e4a);border-radius:20px 20px 0 0;padding:34px 24px 30px;">
        <img src="${LOGO}" width="64" height="64" alt="" style="display:block;border:3px solid #5eead4;border-radius:18px;margin:0 auto 12px;box-shadow:0 8px 24px rgba(0,0,0,.25);">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Claqueta</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#ccfbf1;margin-top:4px;">Tu cine, tus opiniones, tus amigos</div>
      </td></tr>
      <!-- Cuerpo -->
      <tr><td align="center" bgcolor="#ffffff" style="background:#ffffff;padding:38px 36px 34px;">
        <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;font-weight:800;color:#0f172a;text-align:center;">${title}</h1>
        <p style="margin:0 auto 30px;max-width:400px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#475569;text-align:center;">${text}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td align="center" bgcolor="#0f766e" style="border-radius:999px;background:#0f766e;">
            <a href="${url}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${button}</a>
          </td>
        </tr></table>
        <p style="margin:28px auto 0;max-width:400px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#94a3b8;text-align:center;">${note}</p>
      </td></tr>
      <!-- Pie -->
      <tr><td align="center" bgcolor="#f8fafc" style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 20px 20px;padding:20px 24px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8;text-align:center;">
          Si no has sido tú, puedes ignorar este correo.<br>
          <a href="${SITE}" style="color:#0f766e;text-decoration:none;font-weight:700;">miclaqueta.com</a> · <a href="mailto:contacto@miclaqueta.com" style="color:#94a3b8;text-decoration:underline;">contacto@miclaqueta.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export const TEMPLATES = {
  confirmation: {
    subject: "Confirma tu cuenta de Claqueta 🎬",
    preheader: "Un clic y empiezas a llevar tus pelis y series.",
    title: "¡Bienvenido a Claqueta!",
    text: "Solo falta un paso: confirma tu correo y empieza a marcar lo que ves, puntuar tus pelis y series y descubrir gente con tus gustos.",
    button: "Confirmar mi cuenta",
    url: "{{ .ConfirmationURL }}",
    note: "El enlace caduca en 24 horas.",
  },
  recovery: {
    subject: "Cambia tu contraseña de Claqueta",
    preheader: "Elige una contraseña nueva para tu cuenta.",
    title: "¿Has olvidado tu contraseña?",
    text: "No pasa nada. Pulsa el botón y elige una nueva para volver a entrar en tu cuenta.",
    button: "Elegir contraseña nueva",
    url: "{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery",
    note: "El enlace caduca en 1 hora y solo se puede usar una vez.",
  },
  magic_link: {
    subject: "Tu enlace para entrar en Claqueta",
    preheader: "Entra en tu cuenta con un clic.",
    title: "Entra en Claqueta",
    text: "Pulsa el botón para entrar en tu cuenta. No necesitas contraseña.",
    button: "Entrar",
    url: "{{ .ConfirmationURL }}",
    note: "El enlace caduca en 1 hora y solo se puede usar una vez.",
  },
  email_change: {
    subject: "Confirma tu nuevo correo en Claqueta",
    preheader: "Confirma el cambio de correo de tu cuenta.",
    title: "Confirma tu nuevo correo",
    text: "Has pedido cambiar el correo de tu cuenta de Claqueta. Pulsa el botón para confirmarlo.",
    button: "Confirmar correo",
    url: "{{ .ConfirmationURL }}",
    note: "Si no lo has pedido tú, ignora este correo y tu cuenta seguirá igual.",
  },
};

const env = () => {
  try {
    return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  } catch {
    return {};
  }
};

const args = process.argv.slice(2);
if (args.includes("--apply")) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("Falta SUPABASE_ACCESS_TOKEN");
  const body = {};
  for (const [k, v] of Object.entries(TEMPLATES)) {
    body[`mailer_subjects_${k}`] = v.subject;
    body[`mailer_templates_${k}_content`] = template(v);
  }
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Supabase:", r.status, r.ok ? "plantillas actualizadas" : await r.text());
}
const i = args.indexOf("--preview");
if (i >= 0) {
  const to = args[i + 1];
  const key = env().RESEND_API_KEY;
  for (const k of ["confirmation", "recovery"]) {
    const v = TEMPLATES[k];
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Claqueta <contacto@miclaqueta.com>", to: [to], subject: `[Muestra] ${v.subject}`, html: template({ ...v, url: SITE }) }),
    });
    console.log(`Muestra «${k}»:`, r.status, r.ok ? "enviada" : await r.text());
  }
}
