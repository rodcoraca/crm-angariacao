import { queryAgendaLembretesFuturos, queryAgendaLembretesHoje, queryAgendaVisitasHoje } from "../repositories";
import { fetchRows } from "./sharedQueries";
import { resolveEmpresaId } from "../../../utils/empresaScope";
import { listarCompromissosPorPeriodo } from "../../servicos/services/compromissosService";

function normalizarHora(value) {
  return typeof value === "string" ? value.slice(0, 5) : value || "";
}

function normalizarLembretes(lembretes) {
  return lembretes.map((item) => ({
    ...item,
    id: item.lead_id || item.id,
    nome: item.lead?.nome || "Lead sem nome",
    telefone: item.lead?.telefone || "Sem telefone",
    lembrete_ativo: item.estado === "ativo",
    data_lembrete: item.data_lembrete,
    hora_lembrete: item.hora_lembrete
  }));
}

function mapCompromissoParaAgendaItem(compromisso) {
  return {
    id: compromisso.id,
    tipoAgenda: "compromisso",
    nome: compromisso.titulo || "Compromisso",
    telefone: compromisso.telefone || null,
    hora: normalizarHora(compromisso.hora_inicio),
    data: compromisso.data || null,
    informacaoCurta: compromisso.descricao || compromisso.titulo || "Compromisso",
    tooltip: [
      compromisso.titulo,
      compromisso.data,
      normalizarHora(compromisso.hora_inicio),
      compromisso.estado
    ].filter(Boolean).join(" · "),
    estado: compromisso.estado || "pending",
    dataLembrete: null,
    horaLembrete: null,
    leadId: compromisso.lead_id || null,
    empresa_id: compromisso.empresa_id || null,
    usuario_id: compromisso.usuario_id || null,
    origem_tipo: compromisso.origem_tipo || null,
    origem_id: compromisso.origem_id || null
  };
}

export async function fetchCockpitAgenda(user = null) {
  const empresaId = await resolveEmpresaId(user);
  if (!empresaId) {
    return { visitasHoje: [], lembretesHoje: [], compromissosHoje: [] };
  }

  const limite = 5;
  const camposAgenda = "id,nome,telefone,status,data_visita,hora_visita,local_visita,status_visita";
  const camposLembrete = "id,lead_id,data_lembrete,hora_lembrete,estado";
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const dataHoje = [
    inicioHoje.getFullYear(),
    String(inicioHoje.getMonth() + 1).padStart(2, "0"),
    String(inicioHoje.getDate()).padStart(2, "0")
  ].join("-");
  const formatarDataLocal = (data) => [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0")
  ].join("-");
  const dataAmanha = formatarDataLocal(inicioAmanha);

  // A RLS de lead_lembretes já limita os resultados ao perfil autenticado.
  // Não duplicamos esse filtro no cliente, evitando perder lembretes quando
  // o objeto de sessão não contém o perfil no formato esperado.
  // "Lembretes futuros" representa todos os lembretes ativos a partir de amanhã:
  // não existe limite superior de data nem limite artificial de quantidade.
  const lembretesQuery = queryAgendaLembretesHoje(
    camposLembrete,
    dataHoje,
    limite,
    empresaId
  );
  const lembretesFuturosQuery = queryAgendaLembretesFuturos(
    camposLembrete,
    dataAmanha,
    null,
    null,
    empresaId
  );

  const [visitasHoje, lembretesHoje, lembretesFuturos, compromissosHojeResult] = await Promise.all([
    fetchRows(queryAgendaVisitasHoje(camposAgenda, inicioHoje.toISOString(), inicioAmanha.toISOString(), limite, empresaId)),
    lembretesQuery ? fetchRows(lembretesQuery) : Promise.resolve([]),
    lembretesFuturosQuery ? fetchRows(lembretesFuturosQuery) : Promise.resolve([]),
    listarCompromissosPorPeriodo(null, {
      empresa_id: empresaId,
      data: dataHoje,
      limit: limite
    })
  ]);

  const compromissosHoje = Array.isArray(compromissosHojeResult?.data)
    ? compromissosHojeResult.data
        .filter((compromisso) => compromisso && compromisso.data === dataHoje)
        .map(mapCompromissoParaAgendaItem)
    : [];

  return {
    visitasHoje,
    lembretesHoje: normalizarLembretes(lembretesHoje),
    lembretesFuturos: normalizarLembretes(lembretesFuturos),
    compromissosHoje
  };
}
