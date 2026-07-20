import type { NotificationSendPayload } from "../types.ts";

type DemoRequestTemplatePayload = {
  id?: string | null;
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  numero_consultores: number;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildDemoRequestNotification(
  payload: DemoRequestTemplatePayload
): Omit<NotificationSendPayload, "empresaId" | "type"> {
  const subject = "Novo Pedido de Demonstração - OSFlow";
  const recipient = Deno.env.get("DEMO_REQUEST_NOTIFICATION_TO")?.trim() || "comercial@osflow.pt";

  const text = [
    "Novo Pedido de Demonstração - OSFlow",
    "",
    `Nome: ${payload.nome}`,
    `Empresa: ${payload.empresa}`,
    `Email: ${payload.email}`,
    `Telefone: ${payload.telefone}`,
    `Nº Consultores: ${payload.numero_consultores}`
  ].join("\n");

  const html = [
    "<h1>Novo Pedido de Demonstração - OSFlow</h1>",
    "<dl>",
    `<dt>Nome:</dt><dd>${escapeHtml(payload.nome)}</dd>`,
    `<dt>Empresa:</dt><dd>${escapeHtml(payload.empresa)}</dd>`,
    `<dt>Email:</dt><dd>${escapeHtml(payload.email)}</dd>`,
    `<dt>Telefone:</dt><dd>${escapeHtml(payload.telefone)}</dd>`,
    `<dt>Nº Consultores:</dt><dd>${escapeHtml(payload.numero_consultores)}</dd>`,
    "</dl>"
  ].join("\n");

  return {
    recipient,
    subject,
    html,
    text,
    metadata: {
      demoRequestId: payload.id || null,
      source: "landing_request_demo"
    }
  };
}
