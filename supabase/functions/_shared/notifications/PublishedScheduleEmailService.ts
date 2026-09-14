import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { NotificationService } from "./NotificationService.ts";

type ScheduleType = "servico" | "plantao";

type UserRow = {
  id: string;
  nome?: string | null;
  apelido?: string | null;
  email?: string | null;
};

type ScheduleLine = {
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  usuario_id?: string | null;
  titulo?: string | null;
};

type PublishedSchedule = {
  id: string;
  empresa_id: string;
  inicio: string;
  fim: string;
  linhas: ScheduleLine[];
};

type RecipientResult = {
  usuario_id: string;
  nome: string;
  email: string | null;
  status: "enviado" | "falhou";
  erro?: string;
};

export type PublishedScheduleEmailResult = {
  ok: boolean;
  enviados: number;
  falhados: number;
  total: number;
  destinatarios: RecipientResult[];
  erro?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown) {
  return String(value || "").trim();
}

function escapeHtml(value: unknown) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatName(user: UserRow | undefined) {
  return [user?.nome, user?.apelido].filter(Boolean).join(" ").trim() || "Comercial";
}

function weekday(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(new Date(`${value}T00:00:00Z`));
}

function layout(title: string, period: string, rows: string) {
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#f4f6f8;color:#17202a;font-family:Arial,sans-serif;padding:32px"><main style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #dce2e8;padding:32px"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5c6b73">OSFlow</div><h1 style="margin:12px 0 6px;font-size:26px">${escapeHtml(title)}</h1><p style="margin:0 0 24px;color:#5c6b73">Período: ${escapeHtml(period)}</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#eef2f5"><th style="padding:12px;text-align:left">Data</th><th style="padding:12px;text-align:left">Comercial</th></tr></thead><tbody>${rows}</tbody></table><p style="margin:24px 0 0;color:#7a8790;font-size:12px">Esta mensagem corresponde à versão publicada da escala.</p></main></body></html>`;
}

function row(data: string, name: string, extra = "") {
  return `<tr><td style="padding:12px;border-bottom:1px solid #e7ebee">${escapeHtml(data)}${extra ? `<br><small style="color:#7a8790">${escapeHtml(extra)}</small>` : ""}</td><td style="padding:12px;border-bottom:1px solid #e7ebee">${escapeHtml(name)}</td></tr>`;
}

async function loadPublishedSchedule(adminClient: SupabaseClient, empresaId: string, escalaId: string, tipo: ScheduleType): Promise<PublishedSchedule> {
  if (tipo === "servico") {
    const { data: schedule, error: scheduleError } = await adminClient
      .from("escalas_servico")
      .select("id,empresa_id,semana_inicio,semana_fim,estado")
      .eq("id", escalaId)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (scheduleError) throw scheduleError;
    if (!schedule || schedule.estado !== "publicada") throw new Error("escala_nao_publicada");

    const { data: lines, error: linesError } = await adminClient
      .from("escalas_servico_linhas")
      .select("data,hora_inicio,hora_fim,usuario_id,titulo")
      .eq("escala_id", escalaId)
      .order("data", { ascending: true })
      .order("hora_inicio", { ascending: true });
    if (linesError) throw linesError;

    return { id: schedule.id, empresa_id: schedule.empresa_id, inicio: schedule.semana_inicio, fim: schedule.semana_fim, linhas: lines || [] };
  }

  const { data: lines, error: linesError } = await adminClient
    .from("plantoes")
    .select("escala_id,empresa_id,periodo_inicio,periodo_fim,data,hora_inicio,hora_fim,usuario_id,escala_estado")
    .eq("escala_id", escalaId)
    .eq("empresa_id", empresaId)
    .order("data", { ascending: true });
  if (linesError) throw linesError;
  const first = lines?.[0];
  if (!first || lines.some((line) => line.escala_id !== escalaId || line.escala_estado !== "publicada")) {
    throw new Error("escala_nao_publicada");
  }

  return { id: escalaId, empresa_id: first.empresa_id, inicio: first.periodo_inicio, fim: first.periodo_fim, linhas: lines || [] };
}

function buildContent(schedule: PublishedSchedule, tipo: ScheduleType, users: Map<string, UserRow>) {
  const title = tipo === "servico" ? "Escala de Serviço" : "Plantão";
  const subject = `${title} — ${formatDate(schedule.inicio)} a ${formatDate(schedule.fim)}`;
  const rows = schedule.linhas.map((line) => {
    const name = formatName(users.get(String(line.usuario_id || "")));
    if (tipo === "servico") {
      const period = line.hora_inicio && line.hora_inicio < "13:00" ? "Manhã" : "Tarde";
      return row(`${weekday(line.data)} ${formatDate(line.data)}`, name, period);
    }
    return row(`${weekday(line.data)} ${formatDate(line.data)}`, name);
  }).join("");
  return { subject, html: layout(title, `${formatDate(schedule.inicio)} a ${formatDate(schedule.fim)}`, rows) };
}

export async function enviarEscalaPublicadaPorEmail(params: {
  adminClient: SupabaseClient;
  empresaId: string;
  userId: string;
  escalaId: string;
  tipo: ScheduleType;
}): Promise<PublishedScheduleEmailResult> {
  const schedule = await loadPublishedSchedule(params.adminClient, params.empresaId, params.escalaId, params.tipo);
  const userIds = [...new Set(schedule.linhas.map((line) => line.usuario_id).filter(Boolean).map(String))];
  const { data: users, error: usersError } = await params.adminClient
    .from("usuarios")
    .select("id,nome,apelido,email")
    .eq("empresa_id", params.empresaId)
    .in("id", userIds);
  if (usersError) throw usersError;

  const usersById = new Map((users || []).map((user) => [String(user.id), user as UserRow]));
  const content = buildContent(schedule, params.tipo, usersById);
  const recipients: RecipientResult[] = [];

  for (const userId of userIds) {
    const user = usersById.get(userId);
    const name = formatName(user);
    const email = text(user?.email).toLowerCase() || null;
    if (!email || !emailPattern.test(email)) {
      recipients.push({ usuario_id: userId, nome: name, email, status: "falhou", erro: "email_invalido_ou_em_falta" });
      continue;
    }

    const notification = await NotificationService.send({
      empresaId: params.empresaId,
      type: `escala_${params.tipo}`,
      recipient: email,
      subject: content.subject,
      html: content.html,
      metadata: { escala_id: params.escalaId, tipo: params.tipo, user_id: userId }
    }, { adminClient: params.adminClient });
    recipients.push(notification.ok
      ? { usuario_id: userId, nome: name, email, status: "enviado" }
      : { usuario_id: userId, nome: name, email, status: "falhou", erro: notification.error || "envio_falhou" });
  }

  const enviados = recipients.filter((recipient) => recipient.status === "enviado").length;
  const falhados = recipients.length - enviados;
  const result = { ok: enviados > 0 && falhados === 0, enviados, falhados, total: recipients.length, destinatarios: recipients };
  const { error: auditError } = await params.adminClient.from("audit_logs").insert([{
    event_type: `escala.${params.tipo}.email`,
    status: falhados === 0 ? "success" : enviados > 0 ? "partial" : "failed",
    user_id: params.userId,
    empresa_id: params.empresaId,
    modulo: "relatorios",
    entidade: "escala_publicada",
    entidade_id: params.escalaId,
    metadata: { operacao: "enviar_email", tipo: params.tipo, destinatarios: recipients, resultado: result, timestamp: new Date().toISOString() },
    created_at: new Date().toISOString()
  }]);
  if (auditError) console.error("[PublishedScheduleEmail] audit_failed", auditError);

  return result;
}
