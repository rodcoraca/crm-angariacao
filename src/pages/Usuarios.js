import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { MODULOS, normalizarPermissoes } from '../utils/usuarios';
import { useTheme } from '../theme/ThemeContext';
import { usePermissions } from '../modules/auth/hooks';
import { PERMISSION_MODULES } from '../modules/auth/services/permissionCatalog';
import { registrarAcessoNegado, registrarCriacao, registrarEdicao } from '../modules/audit/services';
import UserPersonalSection from '../components/users/UserPersonalSection';
import UserAccountSection from '../components/users/UserAccountSection';
import UserProfileSection from '../components/users/UserProfileSection';
import UserAccessSection from '../components/users/UserAccessSection';
import UserActivitySection from '../components/users/UserActivitySection';
import UserOrganizationSection from '../components/users/UserOrganizationSection';
import UserPreferencesSection from '../components/users/UserPreferencesSection';
import { criarUsuariosViewModel } from '../viewmodels/usuariosViewModel';

export default function Usuarios({ currentUser }) {
  const theme = useTheme();
  const { can } = usePermissions();
  const [usuarios, setUsuarios] = useState([]);
  // Arquitetura SaaS (futuro): quando houver persistencia multi-tenant,
  // este estado/formulario deve passar a acomodar identificadores de contexto organizacional:
  // - empresaId
  // - roleId
  // - departamentoId
  // - equipaId
  // - supervisorId
  // Nesta fase, manter fora do payload e sem impacto funcional.
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
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);
  const [perfilOrganizacional, setPerfilOrganizacional] = useState('');
  const [usuarioSelecionadoMeta, setUsuarioSelecionadoMeta] = useState(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);
    const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    if (!error) {
      setUsuarios(data || []);
    }
    setLoading(false);
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
    });
    setModoEdicao(false);
    setUsuarioSelecionadoId(null);
    setPerfilOrganizacional('');
    setUsuarioSelecionadoMeta(null);
  }

  function atualizarCampo(campo, valor) {
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
    }, {});
    setForm((prev) => ({ ...prev, permissoes: next }));
  }

  async function guardarUsuario() {
    setErro('');

    const requiredPermission = modoEdicao ? 'users.edit' : 'users.create';
    if (!can(requiredPermission)) {
      setErro('Sem permissão para executar esta ação.');
      await registrarAcessoNegado({
        userId: currentUser?.id || null,
        empresaId: currentUser?.user_metadata?.empresa_id || null,
        modulo: 'users',
        entidade: 'usuarios',
        entidadeId: usuarioSelecionadoId || null,
        metadata: {
          requiredPermission,
          action: modoEdicao ? 'update_user' : 'create_user'
        }
      });
      return;
    }

    if (!form.nome || !form.email || !form.username) {
      setErro('Preencha os campos obrigatórios.');
      return;
    }

    if (!modoEdicao && (!form.password || !form.confirmarPassword)) {
      setErro('Defina a password e confirme-a.');
      return;
    }

    if (form.password || form.confirmarPassword) {
      if (form.password !== form.confirmarPassword) {
        setErro('As passwords não coincidem.');
        return;
      }
    }

    const payload = {
      nome: form.nome,
      apelido: form.apelido,
      email: form.email,
      telefone: form.telefone,
      username: form.username,
      permissoes: normalizarPermissoes(form.permissoes),
      ativo: form.ativo,
      criado_por: currentUser?.id || null,
    };

    if (form.password) {
      payload.password_hash = form.password;
    }

    let error;
    if (modoEdicao && usuarioSelecionadoId) {
      ({ error } = await supabase.from('usuarios').update(payload).eq('id', usuarioSelecionadoId));
    } else {
      ({ error } = await supabase.from('usuarios').insert([{
        ...payload,
        created_at: new Date().toISOString(),
      }]));
    }

    if (error) {
      setErro(error.message);
      return;
    }

    const auditoriaBase = {
      userId: currentUser?.id || null,
      empresaId: currentUser?.user_metadata?.empresa_id || null,
      modulo: 'users',
      entidade: 'usuarios',
      entidadeId: usuarioSelecionadoId || null,
      metadata: {
        perfilOrganizacional,
        permissoesSelecionadas: Object.keys(normalizarPermissoes(form.permissoes)).filter((key) => normalizarPermissoes(form.permissoes)[key])
      }
    };

    if (modoEdicao) {
      await registrarEdicao(auditoriaBase);
    } else {
      await registrarCriacao(auditoriaBase);
    }

    resetForm();
    carregarUsuarios();
  }

  function iniciarEdicao(usuario) {
    setModoEdicao(true);
    setUsuarioSelecionadoId(usuario.id);
    // Arquitetura SaaS (futuro): aqui sera o ponto de hidratacao dos IDs organizacionais
    // vindos do modelo de utilizador (empresaId/roleId/departamentoId/equipaId/supervisorId),
    // mantendo a separacao entre camada de dados e camada de apresentacao.
    setUsuarioSelecionadoMeta(usuario);
    setPerfilOrganizacional(usuario.perfil || '');
    setForm({
      nome: usuario.nome || '',
      apelido: usuario.apelido || '',
      email: usuario.email || '',
      telefone: usuario.telefone || '',
      username: usuario.username || '',
      password: '',
      confirmarPassword: '',
      permissoes: usuario.permissoes || {},
      ativo: usuario.ativo !== false,
    });
  }

  const resumo = useMemo(() => ({
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.ativo).length,
  }), [usuarios]);

  const utilizadorVM = useMemo(
    () =>
      criarUsuariosViewModel({
        form,
        perfilOrganizacional,
        usuarioSelecionadoMeta,
        modoEdicao,
        estruturaPermissoes: PERMISSION_MODULES,
      }),
    [form, perfilOrganizacional, usuarioSelecionadoMeta, modoEdicao]
  );

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
    input: {
      padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
      borderRadius: theme.borderRadius.sm,
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      fontFamily: theme.typography.fontFamily,
      outline: 'none',
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
    list: { display: 'grid', gap: theme.spacing.xs },
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
    userActions: { display: 'flex', gap: theme.spacing.xs, alignItems: 'center' },
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
  }), [theme]);

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Gestão de Utilizadores</h2>

      <div style={styles.card}>
        <div style={styles.permissoesHeader}>
          <h3 style={styles.subtitle}>{modoEdicao ? 'Editar utilizador' : 'Criar utilizador'}</h3>
          {modoEdicao ? <button style={styles.linkButton} onClick={resetForm}>Cancelar</button> : null}
        </div>
        {erro ? <div style={styles.error}>{erro}</div> : null}

        <div style={styles.sectionsWrap}>
          <UserPersonalSection dadosPessoais={utilizadorVM.dadosPessoais} onChange={atualizarCampo} styles={styles} />

          <UserAccountSection
            conta={utilizadorVM.conta}
            onChange={atualizarCampo}
            styles={styles}
          />

          <UserProfileSection perfil={utilizadorVM.perfil} onChangePerfil={setPerfilOrganizacional} styles={styles} />

          <UserAccessSection
            controloAcesso={utilizadorVM.controloAcesso}
            onToggleModulo={alternarModulo}
            onToggleGrupo={alternarGrupo}
            onTogglePermissao={alternarPermissao}
            onToggleTodos={alternarTodos}
            styles={styles}
          />

          <UserActivitySection atividade={utilizadorVM.atividade} styles={styles} />
          <UserOrganizationSection organizacao={utilizadorVM.organizacao} styles={styles} />
          <UserPreferencesSection preferencias={utilizadorVM.preferencias} styles={styles} />
        </div>

        <button style={styles.button} onClick={guardarUsuario}>{modoEdicao ? 'Atualizar utilizador' : 'Guardar utilizador'}</button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.subtitle}>Resumo</h3>
        <p>Total: {resumo.total}</p>
        <p>Ativos: {resumo.ativos}</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.subtitle}>Utilizadores registados</h3>
        {loading ? <p>A carregar...</p> : null}
        <div style={styles.list}>
          {usuarios.map((usuario) => (
            <div key={usuario.id} style={styles.userRow}>
              <div>
                <strong>{usuario.nome} {usuario.apelido}</strong>
                <div style={styles.muted}>{usuario.email}</div>
              </div>
              <div style={styles.userActions}>
                <span style={styles.badge}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span>
                <button style={styles.smallButton} onClick={() => iniciarEdicao(usuario)}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
