import type { NotificationSendPayload } from "../types.ts";
import { buildOsflowEmailLayout } from "./layouts/osflowLayout.ts";

type UserActivationPayload = {
  nome?: string | null;
  actionLink: string;
  recipient: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildUserActivationNotification(
  payload: UserActivationPayload
): NotificationSendPayload {
  const subject = "Ativação da sua conta OSFlow";
  const safeName = escapeHtml(payload.nome || "");
  const safeActionLink = escapeHtml(payload.actionLink);
  const greeting = safeName ? `Olá ${safeName},` : "Olá,";
  const html = buildOsflowEmailLayout({
    title: subject,
    preheader: "Defina a sua palavra-passe para ativar a conta OSFlow.",
    children: `
      <h1 style="margin:0 0 18px; font-size:25px; line-height:1.25; color:#0d2c4d; font-weight:700;">${subject}</h1>
      <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#243447;">${greeting}</p>
      <p style="margin:0 0 22px; font-size:16px; line-height:1.7; color:#243447;">A sua conta OSFlow está pronta. Aceda ao botão abaixo para definir a sua palavra-passe e concluir a ativação.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 24px;">
        <tr>
          <td align="center" bgcolor="#0d2c4d" style="border-radius:10px;">
            <a class="osflow-button" href="${safeActionLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block; min-width:210px; padding:14px 22px; border-radius:10px; background:#0d2c4d; color:#ffffff; font-size:15px; line-height:1.2; font-weight:700; text-decoration:none; text-align:center;">Ativar conta</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#526173;">Se não solicitou esta ativação, ignore este email.</p>
      <p style="margin:0; font-size:12px; line-height:1.6; color:#7b8794; word-break:break-all;">Se o botão não funcionar, abra este endereço: ${safeActionLink}</p>
    `
  });

  const text = [
    subject,
    "",
    greeting,
    "",
    "A sua conta OSFlow está pronta. Aceda ao endereço abaixo para definir a sua palavra-passe e concluir a ativação.",
    "",
    payload.actionLink,
    "",
    "Se não solicitou esta ativação, ignore este email.",
    "",
    "Equipa OSFlow"
  ].join("\n");

  return {
    type: "user_activation",
    recipient: payload.recipient,
    subject,
    html,
    text,
    metadata: { audience: "user", purpose: "activation" }
  };
}
