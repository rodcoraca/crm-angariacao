import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { usePermissions } from '../modules/auth/hooks';
import { PERMISSION_MODULES } from '../modules/auth/services/permissionCatalog';
import {
  guardarUsuarioComAuditoria,
  listarAuditoriaPorUtilizador,
  listarPreferenciasPorUtilizador,
  listarSessoesPorUtilizador,
  listarUsuarios,
  obterResumoAtividadePorUtilizador,
  reenviarConviteAtivacaoUtilizador,
  registrarAcaoNegadaUtilizadores,
} from '../modules/users/services';
import UserPersonalSection from '../components/users/UserPersonalSection';
import UserAccountSection from '../components/users/UserAccountSection';
import UserProfileSection from '../components/users/UserProfileSection';
import UserAccessSection from '../components/users/UserAccessSection';
import UserActivitySection from '../components/users/UserActivitySection';
import UserOrganizationSection from '../components/users/UserOrganizationSection';
import UserPreferencesSection from '../components/users/UserPreferencesSection';
import { criarUsuariosViewModel } from '../viewmodels/usuariosViewModel';

const USER_STEPS = [
  { key: 'lista', label: 'Lista de Utilizadores' },
  { key: 'novo', label: 'Novo Utilizador' },
  { key: 'ficha', label: 'Ficha do Utilizador' },
  { key: 'sessoes', label: 'Sessões' },
  { key: 'auditoria', label: 'Auditoria' },
  { key: 'permissoes', label: 'Permissões' },
];

const USER_STEPS_REQUIRE_SELECTION = ['ficha', 'sessoes', 'auditoria', 'permissoes'];

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
  const [sessoesUsuario, setSessoesUsuario] = useState([]);
  const [auditoriaUsuario, setAuditoriaUsuario] = useState([]);
  const [atividadeResumo, setAtividadeResumo] = useState(null);
  const [preferenciasUsuario, setPreferenciasUsuario] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);

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
    if (!usuarioSelecionadoMeta) {
      setSessoesUsuario([]);
      setAuditoriaUsuario([]);
      setAtividadeResumo(null);
      setPreferenciasUsuario(null);
      return;
    }

    carregarTimelineUsuario(usuarioSelecionadoMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioSelecionadoMeta]);

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

  async function carregarTimelineUsuario(usuario) {
    if (!usuario?.id && !usuario?.auth_user_id) return;

    setLoadingTimeline(true);

    const [sessoesResult, auditoriaResult, atividadeResult, preferenciasResult] = await Promise.all([
      listarSessoesPorUtilizador({ perfilId: usuario.id, authUserId: usuario.auth_user_id, currentUser }),
      listarAuditoriaPorUtilizador({ perfilId: usuario.id, authUserId: usuario.auth_user_id, currentUser }),
      obterResumoAtividadePorUtilizador({ perfilId: usuario.id, authUserId: usuario.auth_user_id, currentUser }),
      listarPreferenciasPorUtilizador({ perfilId: usuario.id }),
    ]);

    if (sessoesResult.error) {
      setErro(sessoesResult.error.message || 'Falha ao carregar sessões do utilizador.');
    } else {
      setSessoesUsuario(sessoesResult.data || []);
    }

    if (auditoriaResult.error) {
      setErro(auditoriaResult.error.message || 'Falha ao carregar auditoria do utilizador.');
    } else {
      setAuditoriaUsuario(auditoriaResult.data || []);
    }

    if (atividadeResult.error) {
      setErro(atividadeResult.error.message || 'Falha ao carregar atividade do utilizador.');
      setAtividadeResumo(null);
    } else {
      setAtividadeResumo(atividadeResult.data || null);
    }

    if (preferenciasResult.error) {
      setErro(preferenciasResult.error.message || 'Falha ao carregar preferencias do utilizador.');
      setPreferenciasUsuario(null);
    } else {
      setPreferenciasUsuario(preferenciasResult.data || null);
    }

    setLoadingTimeline(false);
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
    setSessoesUsuario([]);
    setAuditoriaUsuario([]);
    setAtividadeResumo(null);
    setPreferenciasUsuario(null);
  }

  function iniciarNovoUtilizador() {
    resetForm();
    setEtapaAtiva('novo');
  }

  function iniciarEdicao(usuario) {
    if (!usuario) return;

    setModoEdicao(true);
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
      setErro(resultado.error.message || 'Falha ao guardar utilizador.');
      return;
    }

    resetForm();
    await carregarUsuarios();
    setEtapaAtiva('lista');
  }

  async function reenviarConvite() {
    if (!usuarioSelecionadoMeta?.id) return;

    setErro('');
    setIsResendingInvite(true);

    try {
      const { error } = await reenviarConviteAtivacaoUtilizador({
        usuarioId: usuarioSelecionadoMeta.id,
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
    },
    stepNav: { display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' },
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
                <button style={styles.smallButton} onClick={() => setEtapaAtiva('sessoes')}>Sessões</button>
                <button style={styles.smallButton} onClick={() => setEtapaAtiva('auditoria')}>Auditoria</button>
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
                <div key={usuario.id} style={styles.userRow}>
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
                <button style={styles.actionButton} onClick={guardarUsuario}>Atualizar utilizador</button>
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
                onResendInvite={etapaAtiva === 'ficha' && modoEdicao ? reenviarConvite : null}
                resendInviteLoading={isResendingInvite}
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
              <button style={styles.actionButton} onClick={guardarUsuario}>Atualizar utilizador</button>
              <button style={styles.actionButtonSecondary} onClick={resetForm}>Cancelar</button>
            </div>
          ) : (
            <button style={styles.button} onClick={guardarUsuario}>{modoEdicao ? 'Atualizar utilizador' : 'Guardar utilizador'}</button>
          )}
        </div>
      ) : null}

      {etapaAtiva === 'sessoes' ? (
        <div style={styles.card}>
          <h3 style={styles.subtitle}>Sessões</h3>
          <select
            style={{ ...styles.input, maxWidth: '420px', marginBottom: theme.spacing.sm }}
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
          {!usuarioSelecionadoMeta ? <p>Selecione um utilizador na lista para visualizar sessões.</p> : null}
          {loadingTimeline ? <p>A carregar sessões...</p> : null}

          <div style={styles.timelineList}>
            {sessoesUsuario.map((sessao) => (
              <div key={sessao.id} style={styles.timelineRow}>
                <strong>{sessao.status || 'active'}</strong>
                <span style={styles.timelineMeta}>Login: {sessao.login_at ? new Date(sessao.login_at).toLocaleString('pt-PT') : 'n/d'}</span>
                <span style={styles.timelineMeta}>Última atividade: {sessao.last_activity_at ? new Date(sessao.last_activity_at).toLocaleString('pt-PT') : 'n/d'}</span>
                <span style={styles.timelineMeta}>Logout: {sessao.logout_at ? new Date(sessao.logout_at).toLocaleString('pt-PT') : 'n/d'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {etapaAtiva === 'auditoria' ? (
        <div style={styles.card}>
          <h3 style={styles.subtitle}>Auditoria</h3>
          <select
            style={{ ...styles.input, maxWidth: '420px', marginBottom: theme.spacing.sm }}
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
          {!usuarioSelecionadoMeta ? <p>Selecione um utilizador no dropdown para visualizar auditoria.</p> : null}
          {loadingTimeline ? <p>A carregar auditoria...</p> : null}

          <div style={styles.timelineList}>
            {auditoriaUsuario.map((evento) => (
              <div key={evento.id} style={styles.timelineRow}>
                <strong>{evento.event_type || 'evento'}</strong>
                <span style={styles.timelineMeta}>Status: {evento.status || 'success'}</span>
                <span style={styles.timelineMeta}>Módulo: {evento.modulo || 'n/d'}</span>
                <span style={styles.timelineMeta}>Data: {evento.created_at ? new Date(evento.created_at).toLocaleString('pt-PT') : 'n/d'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
