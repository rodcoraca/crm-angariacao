import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizarTelefone, validarTelefone } from "../../../telefone";
import { useAuthContext } from "../../auth/context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { askConfirmation, notifyError, notifySuccess } from "../../../components/ui/feedbackBus";
import { auditMutation } from "../../audit/services/auditService";
import { buildDefaultClienteForm, fetchClientesService, fetchUsuariosEmpresaService, mapClienteParaFormulario, salvarClienteService, excluirClienteService } from "../services/clientesService";

export function useClientes() {
  const { user } = useAuthContext();
  const { can } = usePermissions();

  const [clientes, setClientes] = useState([]);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [busca, setBusca] = useState("");
  const [moduloAtual, setModuloAtual] = useState("lista");
  const [form, setForm] = useState(buildDefaultClienteForm());
  const [clienteEdicao, setClienteEdicao] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const podeVer = can("estoque_nao_publicitado.view");
  const podeCriar = can("estoque_nao_publicitado.create_client");
  const podeEditar = can("estoque_nao_publicitado.edit_client");
  const podeEliminar = can("estoque_nao_publicitado.delete_client");
  const podeVerDadosPrivados = can("estoque_nao_publicitado.view_private_data");
  const currentProfileId = user?.perfil_id || user?.id || null;

  const carregarDados = useCallback(async () => {
    if (!podeVer) return;

    setLoading(true);
    setError("");

    const [{ data: clientesData = [] }, { data: usuariosData = [] }] = await Promise.all([
      fetchClientesService(),
      fetchUsuariosEmpresaService()
    ]);

    setClientes(clientesData || []);
    setUsuariosEmpresa(usuariosData || []);
    setLoading(false);
  }, [podeVer]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;

    return clientes.filter((cliente) => {
      const responsavel = usuariosEmpresa.find((usuario) => String(usuario.id) === String(cliente.responsavel_angariacao));
      const labelResponsavel = responsavel ? `${responsavel.nome || ""} ${responsavel.apelido || ""}`.trim() : "";
      const searchable = [
        cliente.nome_designacao,
        cliente.tipo_cliente,
        cliente.nipc,
        cliente.ami,
        labelResponsavel,
        cliente.morada
      ].join(" ").toLowerCase();

      return searchable.includes(termo);
    });
  }, [busca, clientes, usuariosEmpresa]);

  function setField(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function resetFormulario() {
    setClienteEdicao(null);
    setForm(buildDefaultClienteForm());
    setError("");
  }

  function abrirNovoCliente() {
    if (!podeCriar) {
      notifyError("Sem permissão para criar cliente.");
      return;
    }

    resetFormulario();
    setForm((prev) => ({
      ...prev,
      responsavel_angariacao: currentProfileId || ""
    }));
    setModuloAtual("cadastro");
  }

  function iniciarEdicaoCliente(cliente) {
    if (!podeEditar) {
      notifyError("Sem permissão para editar cliente.");
      return;
    }

    setClienteEdicao(cliente);
    setForm(mapClienteParaFormulario(cliente));
    setModuloAtual("cadastro");
  }

  function voltarParaLista() {
    setModuloAtual("lista");
    resetFormulario();
  }

  function validarTelefoneCliente(valor) {
    if (!valor) return true;
    const telefone = normalizarTelefone(valor);
    return /^351\d{9}$/.test(telefone) && validarTelefone(telefone);
  }

  function validarEmailCliente(valor) {
    if (!valor) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());
  }

  async function salvarCliente() {
    if (!podeCriar && !clienteEdicao) {
      notifyError("Sem permissão para criar cliente.");
      return;
    }

    if (clienteEdicao && !podeEditar) {
      notifyError("Sem permissão para editar cliente.");
      return;
    }

    if (!form.tipo_cliente?.trim()) {
      setError("Selecione o tipo de cliente.");
      return;
    }

    if (!form.nome_designacao?.trim()) {
      setError("Preencha o nome/designação do cliente.");
      return;
    }

    const camposTelefone = [
      ["telefone_responsavel", "Telefone responsável"],
      ["telefone_fixo", "Telefone fixo"],
      ["telefone_movel", "Telefone móvel"],
      ["telemovel_contacto_1", "Telemóvel do contacto 1"],
      ["telemovel_contacto_2", "Telemóvel do contacto 2"]
    ];

    for (const [campo, nomeCampo] of camposTelefone) {
      if (!form[campo]) continue;
      if (!validarTelefoneCliente(form[campo])) {
        setError(`${nomeCampo} inválido. Use o formato 351912345678.`);
        return;
      }
    }

    const camposEmail = [
      ["email_responsavel", "Email responsável"],
      ["email", "Email"],
      ["email_contacto_1", "Email do contacto 1"],
      ["email_contacto_2", "Email do contacto 2"]
    ];

    for (const [campo, nomeCampo] of camposEmail) {
      if (!form[campo]) continue;
      if (!validarEmailCliente(form[campo])) {
        setError(`${nomeCampo} inválido. Use um email no formato nome@dominio.pt.`);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const isEditing = Boolean(clienteEdicao);

    try {
      const result = await auditMutation(
        isEditing ? "update" : "create",
        async () => {
          const response = await salvarClienteService({
            form,
            isEditing,
            clienteEdicao,
            currentUser: user
          });

          if (response.error) {
            throw response.error;
          }

          return response.data?.[0] || response.data || clienteEdicao || null;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "clientes",
          entidadeId: clienteEdicao?.id || null,
          metadata: {
            action: isEditing ? "Cliente atualizado" : "Cliente criado",
            tipo_cliente: form.tipo_cliente,
            nome_designacao: form.nome_designacao,
            responsavel_angariacao: form.responsavel_angariacao || null
          }
        }
      );

      notifySuccess(isEditing ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
      setSubmitting(false);
      setClienteEdicao(null);
      setModuloAtual("lista");
      resetFormulario();
      await carregarDados();
      return result;
    } catch (err) {
      setSubmitting(false);
      const message = err?.message || "Não foi possível guardar o cliente.";
      setError(message);
      notifyError(message);
      return null;
    }
  }

  async function excluirCliente(cliente) {
    if (!podeEliminar) {
      notifyError("Sem permissão para eliminar cliente.");
      return;
    }

    const confirmado = await askConfirmation({
      title: "Eliminar cliente",
      message: `Deseja eliminar o cliente ${cliente?.nome_designacao || "selecionado"}?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar"
    });

    if (!confirmado) {
      return;
    }

    try {
      const response = await auditMutation(
        "delete",
        async () => {
          const result = await excluirClienteService({ clienteId: cliente.id, currentUser: user });
          if (result.error) {
            throw result.error;
          }
          return result.data;
        },
        {
          userId: user?.id || user?.perfil_id || null,
          empresaId: user?.empresa_id || null,
          modulo: "estoque_nao_publicitado",
          entidade: "clientes",
          entidadeId: cliente.id,
          metadata: {
            action: "Cliente eliminado",
            nome_designacao: cliente.nome_designacao
          }
        }
      );

      if (response) {
        notifySuccess("Cliente eliminado com sucesso.");
        await carregarDados();
      }
    } catch (err) {
      const message = err?.message || "Não foi possível eliminar o cliente.";
      notifyError(message);
    }
  }

  const responsavelAtual = usuariosEmpresa.find((usuario) => String(usuario.id) === String(currentProfileId));

  return {
    clientes,
    usuariosEmpresa,
    busca,
    setBusca,
    moduloAtual,
    setModuloAtual,
    form,
    setField,
    clienteEdicao,
    submitting,
    loading,
    error,
    setError,
    filtrados,
    podeVer,
    podeCriar,
    podeEditar,
    podeEliminar,
    podeVerDadosPrivados,
    currentProfileId,
    responsavelAtual,
    abrirNovoCliente,
    voltarParaLista,
    iniciarEdicaoCliente,
    salvarCliente,
    excluirCliente,
    resetFormulario
  };
}
