import { supabase } from "../../../supabase";
import { countRows } from "./sharedQueries";

export async function fetchCockpitKpis() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);

  const [
    leadsAtivasCount,
    leadsSemContactoCount,
    leadsAgendadasCount,
    negociosFechadosCount,
    imoveisIncompletosCount,
    atividadesHojeCount
  ] = await Promise.all([
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .or("status.neq.fechado,status.is.null")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "agendado")
    ),
    countRows(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "fechado")
    ),
    countRows(
      supabase
        .from("estoque_nao_publicitado")
        .select("id", { count: "exact", head: true })
        .or([
          "cmi.is.false",
          "cmi.is.null",
          "caderneta_predial.is.false",
          "caderneta_predial.is.null",
          "plantas.is.false",
          "plantas.is.null",
          "certificado_energetico.is.false",
          "certificado_energetico.is.null",
          "cartao_cidadao.is.false",
          "cartao_cidadao.is.null"
        ].join(","))
    ),
    countRows(
      supabase
        .from("logs_navegacao")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioHoje.toISOString())
        .lt("created_at", inicioAmanha.toISOString())
    )
  ]);

  return {
    "kpi-leads-ativas": String(leadsAtivasCount),
    "kpi-leads-sem-contacto": String(leadsSemContactoCount),
    "kpi-leads-agendadas": String(leadsAgendadasCount),
    "kpi-negocios-fechados": String(negociosFechadosCount),
    "kpi-imoveis-incompletos": String(imoveisIncompletosCount),
    "kpi-atividades-hoje": String(atividadesHojeCount)
  };
}
