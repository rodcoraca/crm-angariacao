import {
  createEmpresaRepository,
  listEmpresasRepository,
  listLeadsForEmpresaIndicatorsRepository,
  listProviderLeadsForEmpresaIndicatorsRepository,
  listUsuariosForEmpresaAssociationRepository,
  updateEmpresaRepository,
  associateUsuarioEmpresaRepository
} from "../repositories";
import { registrarCriacao, registrarEdicao } from "../../audit/services";
import {
  hasEmpresaId,
  resolveEmpresaIdFromContext,
  warnMissingEmpresaId
} from "../../../utils/empresaScope";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateEmpresaInput(form = {}) {
  const nome = String(form.nome || "").trim();
  const estado = String(form.estado || "ativo").trim().toLowerCase();
  const slug = slugify(form.slug || nome);

  if (!nome) {
    return { ok: false, message: "Nome da empresa é obrigatório." };
  }

  if (!slug) {
    return { ok: false, message: "Slug da empresa é obrigatório." };
  }

  if (!["ativo", "inativo"].includes(estado)) {
    return { ok: false, message: "Estado inválido." };
  }

  return {
    ok: true,
    payload: {
      nome,
      slug,
      estado
    }
  };
}

export async function listarEmpresas({ currentUser } = {}) {
  const scopedEmpresaId = resolveEmpresaIdFromContext(currentUser);
  const { data, error } = await listEmpresasRepository();

  if (error) {
    return { data: [], error };
  }

  if (!hasEmpresaId(scopedEmpresaId)) {
    warnMissingEmpresaId();
    return { data: data || [], error: null };
  }

  const scopedData = (data || []).filter((empresa) => String(empresa.id) === String(scopedEmpresaId));
  return { data: scopedData, error: null };
}

export async function criarEmpresa({ form, currentUser }) {
  const validation = validateEmpresaInput(form);
  if (!validation.ok) {
    return { data: null, error: { message: validation.message } };
  }

  const { data, error } = await createEmpresaRepository({
    ...validation.payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (error) {
    return { data: null, error };
  }

  await registrarCriacao({
    userId: currentUser?.perfil_id || currentUser?.id || null,
    empresaId: data?.id || null,
    modulo: "empresas",
    entidade: "empresas",
    entidadeId: data?.id || null,
    metadata: {
      action: "create_empresa",
      nome: data?.nome || null,
      slug: data?.slug || null
    }
  });

  return { data, error: null };
}

export async function editarEmpresa({ empresaId, form, currentUser }) {
  if (!empresaId) {
    return { data: null, error: { message: "Empresa inválida." } };
  }

  const validation = validateEmpresaInput(form);
  if (!validation.ok) {
    return { data: null, error: { message: validation.message } };
  }

  const { data, error } = await updateEmpresaRepository(empresaId, {
    ...validation.payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    return { data: null, error };
  }

  await registrarEdicao({
    userId: currentUser?.perfil_id || currentUser?.id || null,
    empresaId: data?.id || null,
    modulo: "empresas",
    entidade: "empresas",
    entidadeId: data?.id || null,
    metadata: {
      action: "update_empresa",
      nome: data?.nome || null,
      slug: data?.slug || null,
      estado: data?.estado || null
    }
  });

  return { data, error: null };
}

export async function listarUtilizadoresParaAssociacao() {
  const { data, error } = await listUsuariosForEmpresaAssociationRepository();
  return {
    data: data || [],
    error: error || null
  };
}

function countByEmpresa(items = []) {
  return (items || []).reduce((acc, item) => {
    const empresaId = String(item?.empresa_id || "").trim();
    if (!empresaId) return acc;
    acc[empresaId] = (acc[empresaId] || 0) + 1;
    return acc;
  }, {});
}

export async function listarEmpresasDashboard({ currentUser } = {}) {
  const [empresasResult, usuariosResult, leadsResult, opportunitiesResult] = await Promise.all([
    listarEmpresas({ currentUser }),
    listUsuariosForEmpresaAssociationRepository(),
    listLeadsForEmpresaIndicatorsRepository(),
    listProviderLeadsForEmpresaIndicatorsRepository()
  ]);

  const error = empresasResult.error || usuariosResult.error || leadsResult.error || opportunitiesResult.error;
  if (error) {
    return {
      data: {
        empresas: [],
        utilizadoresAssociados: [],
        utilizadoresOrfaos: [],
        indicadoresTotais: {
          empresas: 0,
          utilizadores: 0,
          leads: 0,
          oportunidades: 0
        }
      },
      error
    };
  }

  const empresas = empresasResult.data || [];
  const usuarios = usuariosResult.data || [];
  const leads = leadsResult.data || [];
  const opportunities = opportunitiesResult.data || [];

  const usersByEmpresa = countByEmpresa(usuarios);
  const leadsByEmpresa = countByEmpresa(leads);
  const opportunitiesByEmpresa = countByEmpresa(opportunities);

  const empresasComIndicadores = empresas.map((empresa) => {
    const empresaId = String(empresa?.id || "");
    return {
      ...empresa,
      utilizadores: usersByEmpresa[empresaId] || 0,
      leads: leadsByEmpresa[empresaId] || 0,
      oportunidades: opportunitiesByEmpresa[empresaId] || 0
    };
  });

  const utilizadoresAssociados = usuarios
    .filter((usuario) => String(usuario?.empresa_id || "").trim())
    .map((usuario) => ({
      ...usuario,
      empresa_nome: empresas.find((empresa) => String(empresa.id) === String(usuario.empresa_id))?.nome || "Empresa desconhecida"
    }));

  const utilizadoresOrfaos = usuarios
    .filter((usuario) => !String(usuario?.empresa_id || "").trim());

  return {
    data: {
      empresas: empresasComIndicadores,
      utilizadoresAssociados,
      utilizadoresOrfaos,
      indicadoresTotais: {
        empresas: empresas.length,
        utilizadores: utilizadoresAssociados.length,
        leads: leads.filter((item) => String(item?.empresa_id || "").trim()).length,
        oportunidades: opportunities.filter((item) => String(item?.empresa_id || "").trim()).length
      }
    },
    error: null
  };
}

export async function associarUtilizadorEmpresa({ usuarioId, empresaId, currentUser }) {
  const normalizedUserId = String(usuarioId || "").trim();
  const normalizedEmpresaId = String(empresaId || "").trim();

  if (!normalizedUserId || !normalizedEmpresaId) {
    warnMissingEmpresaId();
    return {
      data: null,
      error: {
        message: "usuario_id e empresa_id são obrigatórios para associação."
      }
    };
  }

  const { data, error } = await associateUsuarioEmpresaRepository(normalizedUserId, normalizedEmpresaId);
  if (error) {
    return { data: null, error };
  }

  await registrarEdicao({
    userId: currentUser?.perfil_id || currentUser?.id || null,
    empresaId: normalizedEmpresaId,
    modulo: "empresas",
    entidade: "usuarios",
    entidadeId: normalizedUserId,
    metadata: {
      action: "associate_user_empresa",
      usuarioId: normalizedUserId,
      empresaId: normalizedEmpresaId
    }
  });

  return { data, error: null };
}
