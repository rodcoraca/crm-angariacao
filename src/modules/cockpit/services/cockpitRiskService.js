import { supabase } from "../../../supabase";
import { fetchRows } from "./sharedQueries";

export async function fetchCockpitRisk() {
  const [imoveis, ficheiros] = await Promise.all([
    fetchRows(
      supabase
        .from("estoque_nao_publicitado")
        .select([
          "id",
          "proprietario",
          "telefone",
          "tipologia",
          "zona",
          "valor_pretendido",
          "morada",
          "concelho",
          "distrito",
          "cmi",
          "caderneta_predial",
          "plantas",
          "certificado_energetico",
          "cartao_cidadao"
        ].join(","))
    ),
    fetchRows(
      supabase
        .from("imovel_ficheiros")
        .select("id,imovel_id")
    )
  ]);

  return {
    imoveis,
    ficheiros
  };
}
