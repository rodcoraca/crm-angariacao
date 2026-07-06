import {
  queryFollowupPendente,
  queryLeadsConfirmacaoVisitasComData,
  queryLeadsConfirmacaoVisitasSemData,
  queryLeadsSemContacto,
  queryLeadsSemResponsavel
} from "../repositories";
import { fetchLeadsConfirmacaoVisitas, fetchRows } from "./sharedQueries";

export async function fetchCockpitActions() {
  const limite = 5;
  const camposBase = "id,nome,telefone,created_at,data_visita,hora_visita,local_visita,status_visita";
  const camposFollowup = "id,nome,telefone,updated_at,data_visita,hora_visita,local_visita,status_visita";
  const camposComDataVisita = "id,nome,telefone,created_at,data_visita,hora_visita,local_visita,status_visita";
  const camposSemDataVisita = "id,nome,telefone,created_at,hora_visita,local_visita,status_visita";
  const dataLimiteFollowup = new Date();
  dataLimiteFollowup.setDate(dataLimiteFollowup.getDate() - 3);

  const [leadsSemContacto, followupPendente, leadsSemResponsavel, confirmacaoVisitas] = await Promise.all([
    fetchRows(queryLeadsSemContacto(camposBase, limite)),
    fetchRows(queryFollowupPendente(camposFollowup, dataLimiteFollowup.toISOString(), limite)),
    fetchRows(queryLeadsSemResponsavel(camposBase, limite)),
    fetchLeadsConfirmacaoVisitas({
      queryComData: queryLeadsConfirmacaoVisitasComData(camposComDataVisita),
      querySemData: queryLeadsConfirmacaoVisitasSemData(camposSemDataVisita),
      limite
    })
  ]);

  return {
    leadsSemContacto,
    followupPendente,
    leadsSemResponsavel,
    confirmacaoVisitas
  };
}
