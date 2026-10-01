import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { usePermissions } from '../modules/auth/hooks';
import { PERMISSION_MODULES } from '../modules/auth/services/permissionCatalog';
import { listarAtividadeUtilizador } from '../modules/audit/services';
import {
  enviarRedefinicaoPasswordUtilizador,
  guardarUsuarioComAuditoria,
  listarPreferenciasPorUtilizador,
  listarUsuarios,
  obterResumoAtividadePorUtilizador,
  repararAssociacaoAuthUtilizador,
  reenviarConviteAtivacaoUtilizador,
  registrarAcaoNegadaUtilizadores,
} from '../modules/users/services';
import { getAppRedirectBaseUrl } from '../modules/auth/services';
import UserPersonalSection from '../components/users/UserPersonalSection';
import UserAccountSection from '../components/users/UserAccountSection';
import UserProfileSection from '../components/users/UserProfileSection';
import UserAccessSection from '../components/users/UserAccessSection';
import UserActivitySection from '../components/users/UserActivitySection';
import UserOrganizationSection from '../components/users/UserOrganizationSection';
import UserPreferencesSection from '../components/users/UserPreferencesSection';
import { criarUsuariosViewModel } from '../viewmodels/usuariosViewModel';
import { notifySuccess } from '../components/ui/feedbackBus';

const USER_STEPS = [
  { key: 'lista', label: 'Lista de Utilizadores' },
  { key: 'novo', label: 'Novo Utilizador' },
  { key: 'ficha', label: 'Ficha do Utilizador' },
  { key: 'atividade', label: 'Atividade' },
  { key: 'permissoes', label: 'Permissões' },
];

const USER_ACTIVITY_TABS = [
  { key: 'registos', label: 'Registos' },
  { key: 'sessoes', label: 'Sessões' },
  { key: 'navegacao', label: 'Navegação' },
];

const USER_STEPS_REQUIRE_SELECTION = ['ficha', 'atividade', 'permissoes'];

function resolveAccountStatus(usuario) {
  const status = String(usuario?.account_status || '').trim().toLowerCase();
  if (status === 'pending_activation' || status === 'active' || status === 'disabled') {
    return status;
  }

  return usuario?.ativo === false ? 'disabled' : 'active';
}

function getAccountStatusLabel(status) {
  if (status === 'pending_activation') return 'Pendente ativação';
  if (status === 'disabled') return 'Desativado';
  return 'Ativo';
}

function resolveAdministrativeStatus(usuario) {
  const hasAuthUser = Boolean(String(usuario?.auth_user_id || '').trim());
  const hasEmpresa = Boolean(String(usuario?.empresa_id || '').trim());

  if (!hasAuthUser) return 'auth_unlinked';
  if (!hasEmpresa) return 'empresa_unlinked';
  if (resolveAccountStatus(usuario) === 'pending_activation') return 'pending_activation';
  return 'active';
}

function getAdministrativeStatusLabel(status) {
  if (status === 'auth_unlinked') return 'Auth não associado';
  if (status === 'empresa_unlinked') return 'Empresa não associada';
  if (status === 'pending_activation') return 'Ativação pendente';
  return 'Ativo';
}

function getAdministrativeBadgeStyle(theme, status) {
  if (status === 'active') {
    return {
      background: `${theme.colors.success}22`,
      color: theme.colors.success,
    };
  }

  return {
    background: `${theme.colors.warning}22`,
    color: theme.colors.warning,
  };
}

export default function Usuarios({ currentUser, selectionRequest = null }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const lastSelectionRequestRef = useRef(null);

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [etapaAtiva, setEtapaAtiva] = useState('lista');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);
  const [usuarioSelecionadoMeta, setUsuarioSelecionadoMeta] = useState(null);

  const [filtroPesquisa, setFiltroPesquisa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [perfilOrganizacional, setPerfilOrganizacional] = useState('');
  const [atividadeTab, setAtividadeTab] = useState('registos');
  const [sessoesUsuario, setSessoesUsuario] = useState([]);
  const [auditoriaUsuario, setAuditoriaUsuario] = useState([]);
  const [navegacaoUsuario, setNavegacaoUsuario] = useState([]);
  const [atividadeCounts, setAtividadeCounts] = useState({ sessoes: 0, auditoria: 0, navegacao: 0 });
  const [atividadeHasMore, setAtividadeHasMore] = useState({ sessoes: false, auditoria: false, navegacao: false });
  const [atividadeResumo, setAtividadeResumo] = useState(null);
  const [preferenciasUsuario, setPreferenciasUsuario] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isRepairingAssociation, setIsRepairingAssociation] = useState(false);
  const [paginaSessoes, setPaginaSessoes] = useState(0);
  const [paginaAuditoria, setPaginaAuditoria] = useState(0);
  const [paginaNavegacao, setPaginaNavegacao] = useState(0);

  // Arquitetura SaaS (futuro): quando houver persistencia multi-tenant,
  // este formulario deve acomodar identificadores de contexto organizacional
  // sem impacto funcional nesta fase.
  const [form, setForm] = useState({
    nome: '',
    apelido: '',
    email: '',
    telefone: '',
    username: '',
    password: '',
    confirmarPassword: '',
    permissoes: {},
    ativo: true,
    account_status: 'pending_activation',
    empresa_id: currentUser?.empresa_id || currentUser?.user_metadata?.empresa_id || null,
  });

  useEffect(() => {
    carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("[BUG-017][useEffect]", { usuarioId: usuarioSelecionadoMeta?.id, ts: Date.now() });
    if (!usuarioSelecionadoMeta) {
      console.log("[BUG-017][RESET_SESSOES]", { origem: "useEffect", ts: Date.now() });
      setSessoesUsuario([]);
      setAuditoriaUsuario([]);
      setNavegacaoUsuario([]);
      setAtividadeCounts({ sessoes: 0, auditoria: 0, navegacao: 0 });
      setAtividadeHasMore({ sessoes: false, auditoria: false, navegacao: false });
      setAtividadeResumo(null);
      setPreferenciasUsuario(null);
      setAtividadeTab('registos');
      setPaginaSessoes(0);
      setPaginaAuditoria(0);
      setPaginaNavegacao(0);
      return;
    }

    carregarTimelineUsuario(usuarioSelecionadoMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioSelecionadoMeta]);

  useEffect(() => {
    console.log("[BUG-017][STATE_SESSOES]", {
      total: sessoesUsuario.length,
      sessoes: sessoesUsuario,
      ts: Date.now(),
    });
  }, [sessoesUsuario]);

  useEffect(() => {
    const requestId = selectionRequest?.id ? `${selectionRequest.id}:${selectionRequest.nonce || ''}` : '';
    if (!requestId || requestId === lastSelectionRequestRef.current || !usuarios.length) {
      return;
    }

    const target = usuarios.find((item) => String(item.id) === String(selectionRequest.id));
    if (!target) {
      return;
    }

    lastSelectionRequestRef.current = requestId;
    setModoEdicao(true);
    setUsuarioSelecionadoId(target.id);
    setUsuarioSelecionadoMeta(target);
    setPerfilOrganizacional(target?.permissoes?.__perfil || '');
    setForm({
      nome: target.nome || '',
      apelido: target.apelido || '',
      email: target.email || '',
      telefone: target.telefone || '',
      username: target.username || '',
      password: '',
      confirmarPassword: '',
      permissoes: target.permissoes || {},
      ativo: resolveAccountStatus(target) !== 'disabled',
      account_status: resolveAccountStatus(target),
      empresa_id: target.empresa_id || currentUser?.empresa_id || currentUser?.user_metadata?.empresa_id || null,
    });
    setEtapaAtiva('ficha');
    setAtividadeTab('registos');
  }, [currentUser?.empresa_id, currentUser?.user_metadata?.empresa_id, selectionRequest, usuarios]);

  async function carregarUsuarios() {
    setLoading(true);
    setErro('');

    const { data, error } = await listarUsuarios({ currentUser });
    if (error) {
      setErro(error.message || 'Falha ao carregar utilizadores.');
      setUsuarios([]);
      setLoading(false);
      return [];
    }

    const lista = data || [];
    setUsuarios(lista);
    setLoading(false);
    return lista;
  }

  async function carregarTimelineUsuario(usuario, page = 1) {
    if (!usuario?.id && !usuario?.auth_user_id) return;

    setLoadingTimeline(true);
    setErro('');

    const [atividadeResult, resumoResult, preferenciasResult] = await Promise.all([
      listarAtividadeUtilizador({ perfilId: usuario.id, authUserId: usuario.auth_user_id, page, pageSize: 50, currentUser }),
      page === 1 ? obterResumoAtividadePorUtilizador({ perfilId: usuario.id, authUserId: usuario.auth_user_id, currentUser }) : Promise.resolve({ data: atividadeResumo, error: null }),
      page === 1 ? listarPreferenciasPorUtilizador({ perfilId: usuario.id }) : Promise.resolve({ data: preferenciasUsuario, error: null }),
    ]);

    if (atividadeResult.error) {
      setErro(atividadeResult.error.message || 'Falha ao carregar atividade do utilizador.');
    } else {
      setSessoesUsuario(atividadeResult.sessoes || []);
      setAuditoriaUsuario(atividadeResult.auditoria || []);
      setNavegacaoUsuario(atividadeResult.navegacao || []);
      setAtividadeCounts(atividadeResult.counts || { sessoes: 0, auditoria: 0, navegacao: 0 });
      setAtividadeHasMore(atividadeResult.hasMore || { sessoes: false, auditoria: false, navegacao: false });
      setPaginaSessoes(page - 1);
      setPaginaAuditoria(page - 1);
      setPaginaNavegacao(page - 1);
    }

    if (resumoResult.error) {
      setErro(resumoResult.error.message || 'Falha ao carregar atividade do utilizador.');
      setAtividadeResumo(null);
    } else if (resumoResult.data) {
      setAtividadeResumo(resumoResult.data);
    }

    if (preferenciasResult.error) {
      setErro(preferenciasResult.error.message || 'Falha ao carregar preferencias do utilizador.');
      setPreferenciasUsuario(null);
    } else if (preferenciasResult.data) {
      setPreferenciasUsuario(preferenciasResult.data);
    }

    setLoadingTimeline(false);
  }

  function carregarPaginaAtividade(page) {
    if (!usuarioSelecionadoMeta || page < 1 || loadingTimeline) return;
    carregarTimelineUsuario(usuarioSelecionadoMeta, page);
  }

  function resetForm() {
    setForm({
      nome: '',
      apelido: '',
      email: '',
      telefone: '',
      username: '',
      password: '',
      confirmarPassword: '',
      permissoes: {},
      ativo: true,
      account_status: 'pending_activation',
      empresa_id: currentUser?.empresa_id || currentUser?.user_metadata?.empresa_id || null,
    });
    setModoEdicao(false);
    setUsuarioSelecionadoId(null);
    setUsuarioSelecionadoMeta(null);
    setPerfilOrganizacional('');
    console.log("[BUG-017][RESET_SESSOES]", { origem: "resetForm", ts: Date.now() });
    setSessoesUsuario([]);
    setAuditoriaUsuario([]);
    setAtividadeResumo(null);
    setPreferenciasUsuario(null);
    setPaginaSessoes(0);
    setPaginaAuditoria(0);
  }

  function iniciarNovoUtilizador() {
    resetForm();
    setEtapaAtiva('novo');
  }

  function iniciarEdicao(usuario) {
    if (!usuario) return;

    setModoEdicao(true);
    setEtapaAtiva('ficha');
    setUsuarioSelecionadoId(usuario.id);
    setUsuarioSelecionadoMeta(usuario);
    setPerfilOrganizacional(usuario?.permissoes?.__perfil || '');

    setForm({
      nome: usuario.nome || '',
      apelido: usuario.apelido || '',
      email: usuario.email || '',
      telefone: usuario.telefone || '',
      username: usuario.username || '',
      password: '',
      confirmarPassword: '',
      permissoes: usuario.permissoes || {},
      ativo: resolveAccountStatus(usuario) !== 'disabled',
      account_status: resolveAccountStatus(usuario),
      empresa_id: usuario.empresa_id || currentUser?.empresa_id || currentUser?.user_metadata?.empresa_id || null,
    });
  }

  function selecionarUtilizadorPorId(usuarioId) {
    if (!usuarioId) {
      setUsuarioSelecionadoId(null);
      setUsuarioSelecionadoMeta(null);
      return;
    }

    const utilizador = usuarios.find((item) => String(item.id) === String(usuarioId));
    if (!utilizador) return;

    iniciarEdicao(utilizador);
  }

  function atualizarCampo(campo, valor) {
    if (campo === 'account_status') {
      const nextStatus = String(valor || '').trim().toLowerCase();
      setForm((prev) => ({
        ...prev,
        account_status: nextStatus,
        ativo: nextStatus !== 'disabled',
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function alternarModulo(modulo) {
    const moduloConfigurado = PERMISSION_MODULES.find((item) => item.key === modulo);
    if (!moduloConfigurado) return;

    const permissionCodes = moduloConfigurado.groups.flatMap((grupo) => grupo.permissions.map((permission) => permission.code));
    const allSelected = permissionCodes.every((code) => form.permissoes?.[code]);

    setForm((prev) => {
      const next = { ...prev.permissoes };
      permissionCodes.forEach((code) => {
        next[code] = !allSelected;
      });

      return {
        ...prev,
        permissoes: next,
      };
    });
  }

  function alternarGrupo(moduloKey, grupoKey) {
    const moduloConfigurado = PERMISSION_MODULES.find((item) => item.key === moduloKey);
    const grupo = moduloConfigurado?.groups?.find((item) => item.key === grupoKey);
    if (!grupo) return;

    const permissionCodes = grupo.permissions.map((permission) => permission.code);
    const allSelected = permissionCodes.every((code) => form.permissoes?.[code]);

    setForm((prev) => ({
      ...prev,
      permissoes: permissionCodes.reduce((acc, code) => {
        acc[code] = !allSelected;
        return acc;
      }, { ...prev.permissoes }),
    }));
  }

  function alternarPermissao(permissao) {
    setForm((prev) => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [permissao]: !prev.permissoes?.[permissao],
      },
    }));
  }

  function alternarTodos() {
    const permissionCodes = PERMISSION_MODULES.flatMap((modulo) =>
      modulo.groups.flatMap((grupo) => grupo.permissions.map((permission) => permission.code))
    );

    const todosAtivos = permissionCodes.every((permissionCode) => form.permissoes?.[permissionCode]);
    const next = permissionCodes.reduce((acc, permissionCode) => {
      acc[permissionCode] = !todosAtivos;
      return acc;
    }, { ...form.permissoes });

    setForm((prev) => ({ ...prev, permissoes: next }));
  }

  async function guardarUsuario() {
    setErro('');

    const requiredPermission = modoEdicao ? 'users.edit' : 'users.create';
    if (!can(requiredPermission)) {
      setErro('Sem permissão para executar esta ação.');
      await registrarAcaoNegadaUtilizadores({
        currentUser,
        usuarioSelecionadoId,
        requiredPermission,
        action: modoEdicao ? 'update_user' : 'create_user',
      });
      return;
    }

    if (!form.nome || !form.email || !form.username) {
      setErro('Preencha os campos obrigatórios.');
      return;
    }

    if (form.password || form.confirmarPassword) {
      if (form.password !== form.confirmarPassword) {
        setErro('As passwords não coincidem.');
        return;
      }
    }

    let resultado;
    try {
      resultado = await guardarUsuarioComAuditoria({
        form,
        modoEdicao,
        usuarioSelecionadoId,
        currentUser,
        perfilOrganizacional,
        permissoesAtuais: usuarioSelecionadoMeta?.permissoes || {},
      });
    } catch (error) {
      setErro(error?.message || 'Falha ao guardar utilizador.');
      return;
    }

    if (resultado?.error) {
      if (resultado.error.code === 'email_already_exists') {
        setErro(
          <>
            <strong>E-mail já registado</strong>
            <br />
            Já existe uma conta associada a este endereço de e-mail.
            <br /><br />
            Utilize outro endereço de e-mail ou utilize a opção "Reenviar Convite", caso pretenda reenviar a ativação da conta existente.
          </>
        );
      } else {
        setErro(resultado.error.message || 'Falha ao guardar utilizador.');
      }
      return;
    }

    notifySuccess(modoEdicao ? 'Utilizador alterado com sucesso.' : 'Utilizador inserido com sucesso.');
    resetForm();
    await carregarUsuarios();
    setEtapaAtiva('lista');
  }

  async function reenviarConvite({ allowEmailChange = false } = {}) {
    if (!usuarioSelecionadoMeta?.id) return;

    const targetEmail = String(form.email || '').trim().toLowerCase();
    const currentEmail = String(usuarioSelecionadoMeta.email || '').trim().toLowerCase();
    if (allowEmailChange && targetEmail !== currentEmail) {
      const confirmed = window.confirm(`A ativação será enviada para ${targetEmail}. Confirmar alteração de email e reativação?`);
      if (!confirmed) return;
    }

    setErro('');
    setIsResendingInvite(true);

    try {
      const redirectBase = getAppRedirectBaseUrl();
      const redirectTo = `${redirectBase.replace(/\/$/, '')}/?activation=1`;
      const { error } = await reenviarConviteAtivacaoUtilizador({
        usuarioId: usuarioSelecionadoMeta.id,
        targetEmail: allowEmailChange ? targetEmail : currentEmail,
        redirectTo,
        currentUser,
      });

      if (error) {
        setErro(error.message || 'Falha ao reenviar convite.');
        return;
      }

      const refreshedUsers = await carregarUsuarios();

      const refreshed = (refreshedUsers || []).find((item) => String(item.id) === String(usuarioSelecionadoMeta.id));
      if (refreshed) {
        iniciarEdicao(refreshed);
      }
    } finally {
      setIsResendingInvite(false);
    }
  }

  async function enviarRedefinicaoPassword() {
    if (!usuarioSelecionadoMeta?.id) return;

    setErro('');
    setIsSendingPasswordReset(true);

    try {
      const redirectTo = getAppRedirectBaseUrl();
      const { error } = await enviarRedefinicaoPasswordUtilizador({
        usuarioId: usuarioSelecionadoMeta.id,
        currentUser,
        redirectTo,
      });

      if (error) {
        setErro(error.message || 'Falha ao enviar redefinição de password.');
        return;
      }

    } finally {
      setIsSendingPasswordReset(false);
    }
  }

  async function repararAssociacaoAuth() {
    if (!usuarioSelecionadoMeta?.id) return;

    if (!can('users.edit')) {
      setErro('Sem permissão para executar esta ação.');
      await registrarAcaoNegadaUtilizadores({
        currentUser,
        usuarioSelecionadoId: usuarioSelecionadoMeta.id,
        requiredPermission: 'users.edit',
        action: 'repair_auth_association',
      });
      return;
    }

    setErro('');
    setIsRepairingAssociation(true);

    try {
      const result = await repararAssociacaoAuthUtilizador({
        usuarioId: usuarioSelecionadoMeta.id,
        email: usuarioSelecionadoMeta.email,
        currentUser,
      });

      if (result?.error) {
        setErro(result.error.message || 'Falha ao reparar associação auth.');
        return;
      }

      const refreshedUsers = await carregarUsuarios();
      const refreshed = (refreshedUsers || []).find((item) => String(item.id) === String(usuarioSelecionadoMeta.id));

      if (refreshed) {
        iniciarEdicao(refreshed);
      }

      await carregarTimelineUsuario(refreshed || usuarioSelecionadoMeta);
    } finally {
      setIsRepairingAssociation(false);
    }
  }

  const resumo = useMemo(() => ({
    total: usuarios.length,
    ativos: usuarios.filter((u) => resolveAccountStatus(u) === 'active').length,
    pendentes: usuarios.filter((u) => resolveAccountStatus(u) === 'pending_activation').length,
    desativados: usuarios.filter((u) => resolveAccountStatus(u) === 'disabled').length,
  }), [usuarios]);

  const ultimoEventoSelecionado = useMemo(() => {
    if (loadingTimeline) return 'A carregar atividade...';
    const evento = auditoriaUsuario[0];
    if (!evento) return 'Sem eventos recentes';

    const data = evento.created_at ? new Date(evento.created_at).toLocaleString('pt-PT') : 'n/d';
    return `${evento.event_type || 'evento'} (${data})`;
  }, [auditoriaUsuario, loadingTimeline]);

  const resumoSelecionado = useMemo(() => {
    if (!usuarioSelecionadoMeta) {
      return {
        nome: 'Nenhum selecionado',
        perfil: 'n/d',
        estado: 'n/d',
        ultimaAtividade: 'Selecione um utilizador',
      };
    }

    const nome = `${usuarioSelecionadoMeta.nome || ''} ${usuarioSelecionadoMeta.apelido || ''}`.trim() || 'Sem nome';
    const perfil = usuarioSelecionadoMeta?.permissoes?.__perfil || 'Nao definido';
    const estado = getAccountStatusLabel(resolveAccountStatus(usuarioSelecionadoMeta));
    const estadoAdministrativo = getAdministrativeStatusLabel(resolveAdministrativeStatus(usuarioSelecionadoMeta));

    const ultimaSessao = sessoesUsuario[0];
    const ultimaAtividade = ultimaSessao?.last_activity_at
      ? new Date(ultimaSessao.last_activity_at).toLocaleString('pt-PT')
      : ultimoEventoSelecionado;

    return {
      nome,
      perfil,
      estado,
      estadoAdministrativo,
      ultimaAtividade,
    };
  }, [usuarioSelecionadoMeta, sessoesUsuario, ultimoEventoSelecionado]);

  const usuariosFiltrados = useMemo(() => {
    const termo = filtroPesquisa.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const nomeCompleto = `${usuario.nome || ''} ${usuario.apelido || ''}`.trim().toLowerCase();
      const email = String(usuario.email || '').toLowerCase();
      const username = String(usuario.username || '').toLowerCase();
      const matchPesquisa = !termo || nomeCompleto.includes(termo) || email.includes(termo) || username.includes(termo);

      if (!matchPesquisa) return false;
      const status = resolveAccountStatus(usuario);
      if (filtroEstado === 'ativos') return status === 'active';
      if (filtroEstado === 'pendentes') return status === 'pending_activation';
      if (filtroEstado === 'inativos') return status === 'disabled';
      return true;
    });
  }, [usuarios, filtroPesquisa, filtroEstado]);

  const utilizadorVM = useMemo(
    () =>
      criarUsuariosViewModel({
        form,
        perfilOrganizacional,
        usuarioSelecionadoMeta,
        modoEdicao,
        sessoesUsuario,
        auditoriaUsuario,
        atividadeResumo,
        preferenciasPersistidas: preferenciasUsuario,
        estruturaPermissoes: PERMISSION_MODULES,
      }),
    [form, perfilOrganizacional, usuarioSelecionadoMeta, modoEdicao, sessoesUsuario, auditoriaUsuario, atividadeResumo, preferenciasUsuario]
  );

  const hasPasswordInput = String(form.password || '').trim().length > 0;
  const isPasswordInvalid = hasPasswordInput && String(form.password || '').length < 8;

  const etapasVisiveis = useMemo(() => {
    if (!usuarioSelecionadoMeta && etapaAtiva === 'lista') {
      return USER_STEPS.filter((step) => step.key === 'novo');
    }

    return USER_STEPS;
  }, [usuarioSelecionadoMeta, etapaAtiva]);

  const styles = useMemo(() => ({
    page: { display: 'grid', gap: theme.spacing.md, fontFamily: theme.typography.fontFamily },
    title: {
      margin: 0,
      color: theme.colors.text,
      fontSize: `calc(${theme.typography.fontSize} * 1.6)`,
      fontWeight: theme.typography.headingWeight,
      lineHeight: 1.1,
    },
    subtitle: {
      margin: `0 0 ${theme.spacing.sm}`,
      color: theme.colors.text,
      fontSize: `calc(${theme.typography.fontSize} * 1.05)`,
      fontWeight: theme.typography.headingWeight,
    },
    card: {
      background: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      boxShadow: theme.shadow.md,
      border: `1px solid ${theme.colors.border}`,
    },
    sectionsWrap: { display: 'grid', gap: theme.spacing.sm },
    sectionCard: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      background: theme.colors.surfaceSoft,
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    sectionTitle: {
      margin: `0 0 ${theme.spacing.xs}`,
      fontSize: `calc(${theme.typography.fontSize} * 0.88)`,
      letterSpacing: '0.02em',
      color: theme.colors.text,
      fontWeight: theme.typography.headingWeight,
    },
    helperText: {
      margin: `0 0 ${theme.spacing.xs}`,
      color: theme.colors.muted,
      fontSize: `calc(${theme.typography.fontSize} * 0.8)`,
      lineHeight: theme.typography.lineHeight,
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: theme.spacing.sm },
    fieldLabel: {
      display: 'grid',
      gap: theme.spacing.xs,
      fontSize: `calc(${theme.typography.fontSize} * 0.82)`,
      color: theme.colors.muted,
    },
    accountGrid: {
      display: 'flex',
      gap: theme.spacing.sm,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      overflowX: 'visible',
      overflowY: 'visible',
    },
    accountFieldLabel: {
      display: 'grid',
      gap: theme.spacing.xs,
      fontSize: `calc(${theme.typography.fontSize} * 0.82)`,
      color: theme.colors.muted,
      minWidth: '170px',
      flex: '1 1 170px',
      width: '100%',
    },
    input: {
      padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.sm,
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      fontFamily: theme.typography.fontFamily,
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
    },
    readOnlyInput: { background: theme.colors.surfaceSoft, color: theme.colors.muted },
    permissoesHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    linkButton: {
      border: 'none',
      background: 'transparent',
      color: theme.colors.primary,
      cursor: 'pointer',
      fontWeight: theme.typography.headingWeight,
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.9)`,
      padding: 0,
    },
    checkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: theme.spacing.xs },
    checkboxItem: {
      display: 'flex',
      gap: theme.spacing.xs,
      alignItems: 'center',
      fontSize: `calc(${theme.typography.fontSize} * 0.88)`,
      color: theme.colors.text,
    },
    placeholderGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: theme.spacing.xs },
    placeholderBox: {
      border: `1px dashed ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      display: 'grid',
      gap: theme.spacing.xs,
      background: theme.colors.surface,
      color: theme.colors.muted,
      fontSize: `calc(${theme.typography.fontSize} * 0.8)`,
    },
    button: {
      marginTop: theme.spacing.sm,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.sm,
      border: 'none',
      background: theme.colors.primary,
      color: theme.colors.textLight,
      cursor: 'pointer',
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.headingWeight,
      fontSize: `calc(${theme.typography.fontSize} * 0.95)`,
    },
    error: {
      color: theme.colors.danger,
      marginBottom: theme.spacing.sm,
      fontSize: `calc(${theme.typography.fontSize} * 0.88)`,
    },
    list: { display: 'grid', gap: theme.spacing.xs, marginTop: theme.spacing.md },
    userRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      gap: theme.spacing.sm,
      background: theme.colors.surface,
    },
    userActions: { display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
    muted: { color: theme.colors.muted, fontSize: `calc(${theme.typography.fontSize} * 0.82)` },
    badge: {
      background: `${theme.colors.success}22`,
      color: theme.colors.success,
      padding: `4px ${theme.spacing.xs}`,
      borderRadius: '999px',
      fontSize: `calc(${theme.typography.fontSize} * 0.75)`,
      fontWeight: theme.typography.headingWeight,
    },
    smallButton: {
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      cursor: 'pointer',
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.82)`,
      flex: '0 0 auto',
      whiteSpace: 'nowrap',
    },
    actionButton: {
      minWidth: '150px',
      height: '36px',
      flex: '1 1 150px',
      maxWidth: '220px',
      borderRadius: theme.borderRadius.sm,
      padding: `0 ${theme.spacing.sm}`,
      border: `1px solid ${theme.colors.primary}`,
      background: theme.colors.primary,
      color: theme.colors.textLight,
      cursor: 'pointer',
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.84)`,
      fontWeight: theme.typography.headingWeight,
    },
    actionButtonSecondary: {
      minWidth: '150px',
      height: '36px',
      flex: '1 1 150px',
      maxWidth: '220px',
      borderRadius: theme.borderRadius.sm,
      padding: `0 ${theme.spacing.sm}`,
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      color: theme.colors.text,
      cursor: 'pointer',
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.84)`,
      fontWeight: theme.typography.headingWeight,
    },
    formActions: {
      display: 'flex',
      gap: theme.spacing.xs,
      rowGap: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      width: '100%',
    },
    formActionsFooter: {
      display: 'flex',
      gap: theme.spacing.xs,
      rowGap: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      width: '100%',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTop: `1px solid ${theme.colors.border}`,
      paddingBottom: '64px',
    },
    stepNav: {
      display: 'flex',
      gap: theme.spacing.xs,
      flexWrap: 'nowrap',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'thin',
      position: 'fixed',
      top: '70px',
      left: '230px',
      right: 0,
      zIndex: 100,
      background: theme.colors.surface,
      padding: `${theme.spacing.xs} var(--os-page-padding)`,
      boxSizing: 'border-box',
      minHeight: '48px',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      boxShadow: theme.shadow.sm,
    },
    stepButton: {
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      borderRadius: '999px',
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      cursor: 'pointer',
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.82)`,
    },
    stepButtonDisabled: {
      opacity: 0.45,
      cursor: 'not-allowed',
    },
    stepButtonActive: {
      background: theme.colors.primary,
      color: theme.colors.textLight,
      borderColor: theme.colors.primary,
    },
    summaryLine: {
      display: 'flex',
      gap: theme.spacing.md,
      alignItems: 'center',
      flexWrap: 'wrap',
      color: theme.colors.text,
      fontSize: `calc(${theme.typography.fontSize} * 0.9)`,
    },
    summaryItem: {
      display: 'inline-flex',
      gap: theme.spacing.xs,
      alignItems: 'center',
    },
    listActions: {
      display: 'flex',
      gap: theme.spacing.xs,
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTop: `1px solid ${theme.colors.border}`,
    },
    emptyActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTop: `1px solid ${theme.colors.border}`,
    },
    bottomStats: {
      display: 'flex',
      gap: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      color: theme.colors.muted,
      fontSize: `calc(${theme.typography.fontSize} * 0.85)`,
      marginTop: theme.spacing.sm,
    },
    filters: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: theme.spacing.xs,
      alignItems: 'center',
    },
    timelineList: { display: 'grid', gap: theme.spacing.xs },
    timelineRow: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.sm,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      background: theme.colors.surface,
      display: 'grid',
      gap: '4px',
    },
    timelineMeta: {
      color: theme.colors.muted,
      fontSize: `calc(${theme.typography.fontSize} * 0.78)`,
    },
    tableHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    tableWrap: { overflowX: 'auto' },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: `calc(${theme.typography.fontSize} * 0.85)`,
      fontFamily: theme.typography.fontFamily,
    },
    th: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      textAlign: 'left',
      fontWeight: theme.typography.headingWeight,
      color: theme.colors.muted,
      fontSize: `calc(${theme.typography.fontSize} * 0.78)`,
      background: theme.colors.surfaceSoft,
      borderBottom: `2px solid ${theme.colors.border}`,
      whiteSpace: 'nowrap',
    },
    td: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderBottom: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      fontSize: `calc(${theme.typography.fontSize} * 0.85)`,
      whiteSpace: 'nowrap',
    },
    pagination: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    pageBtn: {
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      cursor: 'pointer',
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: `calc(${theme.typography.fontSize} * 0.82)`,
    },
  }), [theme]);

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Gestão de Utilizadores</h2>

      <div style={styles.card}>
        <div style={styles.stepNav}>
          {etapasVisiveis.map((step) => (
            (() => {
              const disabled = USER_STEPS_REQUIRE_SELECTION.includes(step.key) && !usuarioSelecionadoMeta;

              return (
            <button
              key={step.key}
              type="button"
              disabled={disabled}
              style={{
                ...styles.stepButton,
                ...(etapaAtiva === step.key ? styles.stepButtonActive : {}),
                ...(disabled ? styles.stepButtonDisabled : {}),
              }}
              onClick={() => {
                if (disabled) return;

                if (step.key === 'novo') {
                  iniciarNovoUtilizador();
                  return;
                }
                setEtapaAtiva(step.key);
              }}
            >
              {step.label}
            </button>
              );
            })()
          ))}
        </div>
      </div>

      {erro ? <div style={styles.error}>{erro}</div> : null}

      {etapaAtiva === 'lista' ? (
        <>
          <div style={styles.card}>
            <h3 style={styles.subtitle}>Resumo</h3>
            <div style={styles.summaryLine}>
              <span style={styles.summaryItem}>
                <strong>Nome:</strong> {resumoSelecionado.nome}
              </span>
              <span style={styles.summaryItem}><strong>Perfil:</strong> {resumoSelecionado.perfil}</span>
              <span style={styles.summaryItem}><strong>Estado:</strong> {resumoSelecionado.estado}</span>
              <span style={styles.summaryItem}><strong>Estado administrativo:</strong> {resumoSelecionado.estadoAdministrativo || 'n/d'}</span>
              <span style={styles.summaryItem}><strong>Ultima atividade:</strong> {resumoSelecionado.ultimaAtividade}</span>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.subtitle}>Utilizadores registados</h3>

            <div style={styles.filters}>
              <select
                style={styles.input}
                value={usuarioSelecionadoId || ''}
                onChange={(event) => selecionarUtilizadorPorId(event.target.value)}
              >
                <option value="">Selecionar utilizador...</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {`${usuario.nome || ''} ${usuario.apelido || ''}`.trim()} - {usuario.email}
                  </option>
                ))}
              </select>
              <input
                style={styles.input}
                placeholder="Pesquisar por nome, email ou username"
                value={filtroPesquisa}
                onChange={(event) => setFiltroPesquisa(event.target.value)}
              />
              <select style={styles.input} value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="pendentes">Pendentes ativação</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>

            {usuarioSelecionadoMeta ? (
              <div style={styles.listActions}>
                <button style={styles.smallButton} onClick={() => setEtapaAtiva('ficha')}>Ficha do Utilizador</button>
                <button style={styles.smallButton} onClick={() => setEtapaAtiva('atividade')}>Atividade</button>
                <button style={styles.smallButton} onClick={() => setEtapaAtiva('permissoes')}>Permissões</button>
              </div>
            ) : (
              <div style={styles.emptyActions}>
                <button style={styles.smallButton} onClick={iniciarNovoUtilizador}>Novo utilizador</button>
              </div>
            )}

            {loading ? <p>A carregar...</p> : null}

            <div style={styles.list}>
              {usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.id}
                  style={{
                    ...styles.userRow,
                    cursor: 'pointer',
                    background: String(usuarioSelecionadoId || '') === String(usuario.id)
                      ? `${theme.colors.primary}12`
                      : styles.userRow.background,
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => iniciarEdicao(usuario)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      iniciarEdicao(usuario);
                    }
                  }}
                  aria-pressed={String(usuarioSelecionadoId || '') === String(usuario.id)}
                >
                  <div>
                    <strong>{usuario.nome} {usuario.apelido}</strong>
                    <div style={styles.muted}>{usuario.email}</div>
                  </div>
                  <div style={styles.userActions}>
                    {String(usuarioSelecionadoId || '') === String(usuario.id) ? <span style={{ ...styles.badge, background: `${theme.colors.primary}22`, color: theme.colors.primary }}>Selecionado</span> : null}
                    <span style={styles.badge}>{getAccountStatusLabel(resolveAccountStatus(usuario))}</span>
                    <span style={{ ...styles.badge, ...getAdministrativeBadgeStyle(theme, resolveAdministrativeStatus(usuario)) }}>
                      {getAdministrativeStatusLabel(resolveAdministrativeStatus(usuario))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.bottomStats}>
              <span><strong>Total:</strong> {resumo.total}</span>
              <span><strong>Ativos:</strong> {resumo.ativos}</span>
              <span><strong>Pendentes:</strong> {resumo.pendentes}</span>
              <span><strong>Desativados:</strong> {resumo.desativados}</span>
            </div>
          </div>
        </>
      ) : null}

      {['novo', 'ficha', 'permissoes'].includes(etapaAtiva) ? (
        <div style={styles.card}>
          <div style={styles.permissoesHeader}>
            <h3 style={styles.subtitle}>{modoEdicao ? 'Editar utilizador' : 'Criar utilizador'}</h3>
            {etapaAtiva === 'ficha' ? (
              <div style={styles.formActions}>
                <button style={styles.actionButton} onClick={guardarUsuario} disabled={isPasswordInvalid}>Atualizar utilizador</button>
                <button style={styles.actionButtonSecondary} onClick={resetForm}>Cancelar</button>
              </div>
            ) : modoEdicao ? <button style={styles.linkButton} onClick={resetForm}>Cancelar</button> : null}
          </div>

          <div style={styles.sectionsWrap}>
            {['novo', 'ficha'].includes(etapaAtiva) ? <UserPersonalSection dadosPessoais={utilizadorVM.dadosPessoais} onChange={atualizarCampo} styles={styles} /> : null}
            {['novo', 'ficha'].includes(etapaAtiva) ? (
              <UserAccountSection
                conta={utilizadorVM.conta}
                onChange={atualizarCampo}
                onResendInvite={etapaAtiva === 'ficha' && modoEdicao ? () => reenviarConvite() : null}
                onReactivate={etapaAtiva === 'ficha' && modoEdicao ? () => reenviarConvite({ allowEmailChange: true }) : null}
                resendInviteLoading={isResendingInvite}
                onSendPasswordReset={etapaAtiva === 'ficha' && modoEdicao ? enviarRedefinicaoPassword : null}
                sendPasswordResetLoading={isSendingPasswordReset}
                onRepairAssociation={etapaAtiva === 'ficha' && modoEdicao ? repararAssociacaoAuth : null}
                repairAssociationLoading={isRepairingAssociation}
                styles={styles}
              />
            ) : null}
            {['novo', 'ficha'].includes(etapaAtiva) ? <UserProfileSection perfil={utilizadorVM.perfil} onChangePerfil={setPerfilOrganizacional} styles={styles} /> : null}

            {etapaAtiva === 'permissoes' ? (
              <UserAccessSection
                controloAcesso={utilizadorVM.controloAcesso}
                onToggleModulo={alternarModulo}
                onToggleGrupo={alternarGrupo}
                onTogglePermissao={alternarPermissao}
                onToggleTodos={alternarTodos}
                styles={styles}
              />
            ) : null}

            {etapaAtiva === 'ficha' ? <UserActivitySection atividade={utilizadorVM.atividade} styles={styles} /> : null}
            {etapaAtiva === 'ficha' ? <UserOrganizationSection organizacao={utilizadorVM.organizacao} styles={styles} /> : null}
            {etapaAtiva === 'ficha' ? <UserPreferencesSection preferencias={utilizadorVM.preferencias} styles={styles} /> : null}
          </div>

          {etapaAtiva === 'ficha' ? (
            <div style={styles.formActionsFooter}>
              <button style={styles.actionButtonSecondary} onClick={resetForm}>Cancelar</button>
            </div>
          ) : (
            <button style={styles.button} onClick={guardarUsuario} disabled={isPasswordInvalid}>{modoEdicao ? 'Atualizar utilizador' : 'Guardar utilizador'}</button>
          )}
        </div>
      ) : null}

      {modoEdicao && usuarioSelecionadoMeta ? (
        <button
          style={{
            ...styles.actionButton,
            position: 'fixed',
            right: theme.spacing.md,
            bottom: theme.spacing.md,
            zIndex: 20,
          }}
          onClick={guardarUsuario}
          disabled={isPasswordInvalid}
        >Atualizar utilizador</button>
      ) : null}

      {etapaAtiva === 'atividade' ? (
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={{ ...styles.subtitle, margin: 0 }}>Atividade do utilizador</h3>
            <span style={styles.muted}>
              {atividadeTab === 'registos'
                ? `${atividadeCounts.auditoria} registos`
                : atividadeTab === 'sessoes'
                  ? `${atividadeCounts.sessoes} registos`
                  : `${atividadeCounts.navegacao} eventos`}
            </span>
          </div>

          <div style={{ ...styles.listActions, marginTop: 0, paddingTop: 0, borderTop: 'none', marginBottom: theme.spacing.sm }}>
            {USER_ACTIVITY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                style={{
                  ...styles.smallButton,
                  ...(atividadeTab === tab.key ? { background: theme.colors.primary, color: theme.colors.textLight, borderColor: theme.colors.primary } : {}),
                }}
                onClick={() => setAtividadeTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!usuarioSelecionadoMeta ? <p style={styles.muted}>Selecione um utilizador na lista para visualizar a atividade.</p> : null}
          {loadingTimeline ? <p style={styles.muted}>A carregar {atividadeTab === 'registos' ? 'registos' : atividadeTab === 'sessoes' ? 'sessões' : 'navegação'}...</p> : null}

          {usuarioSelecionadoMeta && !loadingTimeline ? (
            atividadeTab === 'sessoes' ? (
              sessoesUsuario.length ? (
                <>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead><tr><th style={styles.th}>Estado</th><th style={styles.th}>Login</th><th style={styles.th}>Última atividade</th><th style={styles.th}>Logout</th><th style={styles.th}>Dispositivo</th></tr></thead>
                      <tbody>{sessoesUsuario.map((sessao, idx) => (
                        <tr key={sessao.id} className="osflow-trow" style={{ background: idx % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSoft }}>
                          <td style={styles.td}>{sessao.status || 'active'}</td>
                          <td style={styles.td}>{sessao.login_at ? new Date(sessao.login_at).toLocaleString('pt-PT') : 'n/d'}</td>
                          <td style={styles.td}>{sessao.last_activity_at ? new Date(sessao.last_activity_at).toLocaleString('pt-PT') : 'n/d'}</td>
                          <td style={styles.td}>{sessao.logout_at ? new Date(sessao.logout_at).toLocaleString('pt-PT') : '—'}</td>
                          <td style={styles.td}>{sessao.device || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={paginaSessoes <= 0 || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaSessoes)}>‹ Anterior</button>
                    <span style={styles.muted}>Página {paginaSessoes + 1} · {atividadeCounts.sessoes} sessões</span>
                    <button style={styles.pageBtn} disabled={!atividadeHasMore.sessoes || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaSessoes + 2)}>Seguinte ›</button>
                  </div>
                </>
              ) : <p style={styles.muted}>Nenhuma sessão encontrada.</p>
            ) : atividadeTab === 'navegacao' ? (
              navegacaoUsuario.length ? (
                <>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead><tr><th style={styles.th}>Data/Hora</th><th style={styles.th}>Ação</th><th style={styles.th}>Detalhes</th></tr></thead>
                      <tbody>{navegacaoUsuario.map((evento, idx) => (
                        <tr key={evento.id} className="osflow-trow" style={{ background: idx % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSoft }}>
                          <td style={styles.td}>{evento.created_at ? new Date(evento.created_at).toLocaleString('pt-PT') : 'n/d'}</td>
                          <td style={styles.td}>{evento.acao || '—'}</td>
                          <td style={styles.td}>{evento.detalhes || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={paginaNavegacao <= 0 || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaNavegacao)}>‹ Anterior</button>
                    <span style={styles.muted}>Página {paginaNavegacao + 1} · {atividadeCounts.navegacao} eventos</span>
                    <button style={styles.pageBtn} disabled={!atividadeHasMore.navegacao || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaNavegacao + 2)}>Seguinte ›</button>
                  </div>
                </>
              ) : <p style={styles.muted}>Nenhum evento de navegação encontrado.</p>
            ) : (
              auditoriaUsuario.length ? (
                <>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead><tr><th style={styles.th}>Data/Hora</th><th style={styles.th}>Evento</th><th style={styles.th}>Módulo</th><th style={styles.th}>Estado</th><th style={styles.th}>Entidade</th></tr></thead>
                      <tbody>{auditoriaUsuario.map((evento, idx) => (
                        <tr key={evento.id} className="osflow-trow" style={{ background: idx % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSoft }}>
                          <td style={styles.td}>{evento.created_at ? new Date(evento.created_at).toLocaleString('pt-PT') : 'n/d'}</td>
                          <td style={styles.td}>{evento.event_type || '—'}</td>
                          <td style={styles.td}>{evento.modulo || '—'}</td>
                          <td style={styles.td}>{evento.status || '—'}</td>
                          <td style={styles.td}>{evento.entidade || evento.entidade_id || '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={paginaAuditoria <= 0 || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaAuditoria)}>‹ Anterior</button>
                    <span style={styles.muted}>Página {paginaAuditoria + 1} · {atividadeCounts.auditoria} registos</span>
                    <button style={styles.pageBtn} disabled={!atividadeHasMore.auditoria || loadingTimeline} onClick={() => carregarPaginaAtividade(paginaAuditoria + 2)}>Seguinte ›</button>
                  </div>
                </>
              ) : <p style={styles.muted}>Nenhum registo de auditoria encontrado.</p>
            )
          ) : null}
        </div>
      ) : null}

    </div>
  );
}
