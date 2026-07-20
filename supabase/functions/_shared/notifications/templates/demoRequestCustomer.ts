import type { NotificationSendPayload } from "../types.ts";
import { buildOsflowEmailLayout } from "./layouts/osflowLayout.ts";

type DemoRequestCustomerTemplatePayload = {
  id?: string | null;
  nome: string;
  empresa: string;
  email: string;
  numeroConsultores: number;
  createdAt?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function buildDemoRequestCustomerNotification(
  payload: DemoRequestCustomerTemplatePayload
): NotificationSendPayload {
  const subject = "Recebemos o seu pedido de demonstração - OSFlow";
  const requestDate = formatDate(payload.createdAt);
  const safeName = escapeHtml(payload.nome);
  const safeEmpresa = escapeHtml(payload.empresa);
  const safeNumeroConsultores = escapeHtml(payload.numeroConsultores);
  const safeDate = escapeHtml(requestDate);

  const body = `
    <h1 style="margin:0 0 18px; font-size:25px; line-height:1.25; color:#0d2c4d; font-weight:700;">
      Recebemos o seu pedido de demonstração.
    </h1>
    <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#243447;">Olá ${safeName},</p>
    <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#243447;">
      Obrigado pelo seu interesse na OSFlow.
    </p>
    <p style="margin:0 0 22px; font-size:16px; line-height:1.7; color:#243447;">
      Recebemos o seu pedido de demonstração e a nossa equipa irá entrar em contacto consigo brevemente para agendar uma apresentação personalizada da plataforma.
    </p>
    <p style="margin:0 0 26px; font-size:15px; line-height:1.7; color:#526173;">
      Centralize Leads, CRM, Imóveis, Equipas e Documentos numa única plataforma.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:separate; border-spacing:0; background:#f5f7fa; border:1px solid #e6edf3; border-radius:12px; overflow:hidden; margin:0 0 28px;">
      <tr>
        <td colspan="2" style="padding:16px 18px; background:#eef3f7; color:#0d2c4d; font-size:14px; line-height:1.4; font-weight:700;">Resumo do pedido</td>
      </tr>
      <tr>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#526173; font-size:14px; line-height:1.5; width:44%;">Empresa:</td>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#172033; font-size:14px; line-height:1.5; font-weight:700;">${safeEmpresa}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#526173; font-size:14px; line-height:1.5;">Número de consultores:</td>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#172033; font-size:14px; line-height:1.5; font-weight:700;">${safeNumeroConsultores}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#526173; font-size:14px; line-height:1.5;">Data:</td>
        <td style="padding:14px 18px; border-top:1px solid #e6edf3; color:#172033; font-size:14px; line-height:1.5; font-weight:700;">${safeDate}</td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" bgcolor="#0d2c4d" style="border-radius:10px;">
          <a class="osflow-button" href="https://osflow.pt" target="_blank" style="display:inline-block; min-width:190px; padding:14px 22px; border-radius:10px; background:#0d2c4d; color:#ffffff; font-size:15px; line-height:1.2; font-weight:700; text-decoration:none; text-align:center;">
            Conhecer a OSFlow
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = buildOsflowEmailLayout({
    title: subject,
    preheader: "Recebemos o seu pedido de demonstração da OSFlow.",
    children: body
  });

  const text = [
    "Recebemos o seu pedido de demonstração.",
    "",
    `Olá ${payload.nome},`,
    "",
    "Obrigado pelo seu interesse na OSFlow.",
    "Recebemos o seu pedido de demonstração e a nossa equipa irá entrar em contacto consigo brevemente para agendar uma apresentação personalizada da plataforma.",
    "",
    "Centralize Leads, CRM, Imóveis, Equipas e Documentos numa única plataforma.",
    "",
    "Resumo do pedido",
    `Empresa: ${payload.empresa}`,
    `Número de consultores: ${payload.numeroConsultores}`,
    `Data: ${requestDate}`,
    "",
    "Conhecer a OSFlow: https://osflow.pt",
    "",
    "Equipa OSFlow",
    "Menos tempo a gerir.",
    "Mais tempo a vender.",
    "comercial@osflow.pt",
    "www.osflow.pt",
    "",
    "© OSFlow"
  ].join("\n");

  return {
    empresaId: null,
    type: "demo_request_customer_confirmation",
    recipient: payload.email,
    subject,
    html,
    text,
    metadata: {
      demoRequestId: payload.id || null,
      source: "landing_request_demo",
      audience: "customer"
    }
  };
}
