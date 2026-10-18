import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";
import { auditMutation } from "../../audit/services/auditService";
import {
  buildDefaultCondicoesPagamento,
  fetchCondicoesPagamentoService,
  mapCondicaoPagamentoParaFormulario,
  salvarCondicoesPagamentoService,
  excluirCondicaoPagamentoService,
  validarCondicaoPagamento
} from "../services/condicoesPagamentoService";

const NOMES_ETAPAS_PADRAO = new Set(["entrada", "cpcv", "escritura"]);
const MENSAGEM_NOME_ETAPA_RESERVADO = "Este nome está reservado para uma etapa padrão. Escolha outro nome.";

function normalizarNomeEtapa(nome) {
  return String(nome || "").trim().toLocaleLowerCase();
}

export function useEmpreendimentoCondicoesPagamento({ empreendimentoId = null } = {}) {
  const { user } = useAuthContext();
  const { can } = usePermissions();

  const [condicoes, setCondicoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nextLocalConditionId = useRef(0);

  const podeVer = can("estoque_nao_publicitado.view");
  const podeEditar = can("estoque_nao_publicitado.edit_development");
  const podeCriar = false;
  const podeEliminar = can("estoque_nao_publicitado.edit_development");

  const carregarCondicoes = useCallback(async () => {
    if (!empreendimentoId || !podeVer) {
      setCondicoes([]);
      return;
    }

    setCondicoes([]);
    setLoading(true);
    setError("");

    try {
      const response = await fetchCondicoesPagamentoService(empreendimentoId);
      if (response?.error) {
        throw response.error;
      }

      const rows = response?.data || [];
      const rowsSemRepeticao = rows.filter((row, index) => {
        if (!row?.id) return true;
        return rows.findIndex((candidate) => candidate?.id === row.id) === index;
      });
      const mappedRows = rowsSemRepeticao.map(mapCondicaoPagamentoParaFormulario).map((condicao) => ({
        ...condicao,
        isPermanent: NOMES_ETAPAS_PADRAO.has(normalizarNomeEtapa(condicao.nome_etapa))
      }));
      const nomesExistentes = new Set(mappedRows.map((condicao) => normalizarNomeEtapa(condicao.nome_etapa)));
      const etapasEmFalta = buildDefaultCondicoesPagamento()
        .filter((condicao) => !nomesExistentes.has(normalizarNomeEtapa(condicao.nome_etapa)))
        .map((condicao, index) => ({
          ...condicao,
          ordem: mappedRows.length + index + 1,
          isPermanent: true
        }));
      const condicoesComPermanentes = [...mappedRows, ...etapasEmFalta].map((condicao, index) => ({
        ...condicao,
        ordem: condicao.ordem || index + 1
      }));
      setCondicoes(condicoesComPermanentes);
    } catch (err) {
      setCondicoes([]);
      setError(err?.message || "Não foi possível carregar as condições de pagamento.");
    } finally {
      setLoading(false);
    }
  }, [empreendimentoId, podeVer]);

  useEffect(() => {
    carregarCondicoes();
  }, [carregarCondicoes]);

  const totalPercentual = useMemo(() => {
    const total = condicoes
      .filter((condicao) => condicao.tipo_valor === "percentual")
      .reduce((sum, condicao) => {
        const numericValue = Number(String(condicao.valor || "0").replace(/[%\s€]/g, ""));
        return Number.isFinite(numericValue) ? sum + numericValue : sum;
      }, 0);

    return Math.round((total + Number.EPSILON) * 100) / 100;
  }, [condicoes]);

  const nomesEtapasDuplicados = useMemo(() => {
    const ocorrencias = condicoes.reduce((mapa, condicao) => {
      const nome = String(condicao?.nome_etapa || "").trim();
      if (!nome) return mapa;
      const nomeNormalizado = nome.toLocaleLowerCase();
      mapa.set(nomeNormalizado, (mapa.get(nomeNormalizado) || 0) + 1);
      return mapa;
    }, new Map());

    return [...ocorrencias.entries()]
      .filter(([, quantidade]) => quantidade > 1)
      .map(([nome]) => nome);
  }, [condicoes]);

  function atualizarCondicao(index, campo, valor) {
    setCondicoes((prev) => prev.map((condicao, condicaoIndex) => {
      if (condicaoIndex !== index) return condicao;
      if (condicao.isPermanent && campo === "nome_etapa") return condicao;

      const next = { ...condicao, [campo]: valor };

      if (campo === "negociavel" && valor === false) {
        next.condicao_negociacao = "";
      }

      return next;
    }));
  }

  function adicionarEtapa() {
    if (!podeEditar) {
      notifyError("Sem permissão para alterar condições de pagamento.");
      return;
    }

    nextLocalConditionId.current += 1;
    const localId = `local-condicao-${nextLocalConditionId.current}`;

    setCondicoes((prev) => {
      const rows = [...prev];
      const customSequence = rows.filter((condicao) => condicao.isCustom).length + 1;
      const novaEtapa = {
        id: null,
        localId,
        nome_etapa: `Reforço ${customSequence}`,
        ordem: rows.length + 1,
        tipo_valor: "percentual",
        valor: "",
        negociavel: false,
        condicao_negociacao: "",
        isCustom: true
      };

      rows.push(novaEtapa);

      return rows.map((item, ordemIndex) => ({ ...item, ordem: ordemIndex + 1 }));
    });
  }

  async function removerEtapa(index) {
    if (!podeEditar && !podeEliminar) {
      notifyError("Sem permissão para eliminar etapas personalizadas.");
      return;
    }

    const condicaoSelecionada = condicoes[index];
    if (!condicaoSelecionada) return;

    if (condicaoSelecionada.isPermanent) {
      notifyError("As etapas Entrada, CPCV e Escritura são permanentes e não podem ser eliminadas.");
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar etapa",
      message: `Deseja eliminar a etapa ${condicaoSelecionada?.nome_etapa || "selecionada"}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) return;

    if (condicaoSelecionada?.id) {
      try {
        const result = await excluirCondicaoPagamentoService({ condicaoId: condicaoSelecionada.id, currentUser: user });
        if (result?.error) {
          throw result.error;
        }

        await auditMutation("delete", async () => result, {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimento_condicoes_pagamento",
          entidadeId: condicaoSelecionada.id,
          metadata: {
            action: "Condição de pagamento eliminada",
            empreendimento_id: empreendimentoId,
            etapa: condicaoSelecionada.nome_etapa
          }
        });
      } catch (err) {
        notifyError(err?.message || "Não foi possível eliminar a etapa.");
        return;
      }
    }

    setCondicoes((prev) => prev.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, ordem: itemIndex + 1 })));
    notifySuccess("Etapa eliminada com sucesso.");
  }

  async function salvarCondicoes() {
    if (!empreendimentoId) {
      setError("Selecione primeiro um empreendimento válido.");
      return null;
    }

    if (!podeEditar) {
      notifyError("Sem permissão para alterar condições de pagamento.");
      return null;
    }

    for (const condicao of condicoes) {
      if (!condicao.id && !condicao.isPermanent && NOMES_ETAPAS_PADRAO.has(normalizarNomeEtapa(condicao.nome_etapa))) {
        setError(MENSAGEM_NOME_ETAPA_RESERVADO);
        notifyError(MENSAGEM_NOME_ETAPA_RESERVADO);
        return null;
      }
    }

    if (nomesEtapasDuplicados.length > 0) {
      const nomes = nomesEtapasDuplicados.join(", ");
      const message = `Existem etapas duplicadas (${nomes}). Remova ou renomeie as entradas antes de guardar.`;
      setError(message);
      notifyError(message);
      return null;
    }

    for (const condicao of condicoes) {
      const validacao = validarCondicaoPagamento(condicao);
      if (validacao) {
        setError(validacao);
        return null;
      }
    }

    setSaving(true);
    setError("");

    try {
      const hasExistingIds = condicoes.some((condicao) => condicao.id);
      const auditEvent = hasExistingIds ? "update" : "create";
      const response = await auditMutation(
        auditEvent,
        async () => {
          const result = await salvarCondicoesPagamentoService({ empreendimentoId, condicoes, currentUser: user });
          if (result?.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "empreendimento_condicoes_pagamento",
          entidadeId: empreendimentoId,
          metadata: {
            action: hasExistingIds ? "Condições de pagamento atualizadas" : "Condições de pagamento criadas",
            empreendimento_id: empreendimentoId,
            total_etapas: condicoes.length
          }
        }
      );

      setSaving(false);
      notifySuccess("Condições de pagamento guardadas com sucesso.");
      await carregarCondicoes();
      return response;
    } catch (err) {
      setSaving(false);
      const message = err?.message || "Não foi possível guardar as condições de pagamento.";
      setError(message);
      notifyError(message);
      return null;
    }
  }

  return {
    condicoes,
    loading,
    saving,
    error,
    setError,
    podeVer,
    podeEditar,
    podeCriar,
    podeEliminar,
    totalPercentual,
    nomesEtapasDuplicados,
    atualizarCondicao,
    adicionarEtapa,
    removerEtapa,
    salvarCondicoes,
    carregarCondicoes
  };
}
