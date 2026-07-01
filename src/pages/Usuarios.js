import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { MODULOS, normalizarPermissoes } from '../utils/usuarios';

export default function Usuarios({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
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
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function alternarModulo(modulo) {
    setForm((prev) => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: !prev.permissoes?.[modulo],
      },
    }));
  }

  function alternarTodos() {
    const todosAtivos = MODULOS.every((modulo) => form.permissoes?.[modulo.key]);
    const next = MODULOS.reduce((acc, modulo) => {
      acc[modulo.key] = !todosAtivos;
      return acc;
    }, {});
    setForm((prev) => ({ ...prev, permissoes: next }));
  }

  async function guardarUsuario() {
    setErro('');
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

    resetForm();
    carregarUsuarios();
  }

  function iniciarEdicao(usuario) {
    setModoEdicao(true);
    setUsuarioSelecionadoId(usuario.id);
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

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Gestão de Utilizadores</h2>

      <div style={styles.card}>
        <div style={styles.permissoesHeader}>
          <h3 style={styles.subtitle}>{modoEdicao ? 'Editar utilizador' : 'Criar utilizador'}</h3>
          {modoEdicao ? <button style={styles.linkButton} onClick={resetForm}>Cancelar</button> : null}
        </div>
        {erro ? <div style={styles.error}>{erro}</div> : null}
        <div style={styles.grid}>
          <input style={styles.input} placeholder="Nome" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} />
          <input style={styles.input} placeholder="Apelido" value={form.apelido} onChange={(e) => atualizarCampo('apelido', e.target.value)} />
          <input style={styles.input} placeholder="Email" value={form.email} onChange={(e) => atualizarCampo('email', e.target.value)} />
          <input style={styles.input} placeholder="Telemóvel" value={form.telefone} onChange={(e) => atualizarCampo('telefone', e.target.value)} />
          <input style={styles.input} placeholder="User name" value={form.username} onChange={(e) => atualizarCampo('username', e.target.value)} />
          <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={(e) => atualizarCampo('password', e.target.value)} />
          <input style={styles.input} type="password" placeholder="Confirmar Password" value={form.confirmarPassword} onChange={(e) => atualizarCampo('confirmarPassword', e.target.value)} />
        </div>

        <div style={styles.permissoesBox}>
          <div style={styles.permissoesHeader}>
            <strong>Controlo de acesso por módulos</strong>
            <button style={styles.linkButton} onClick={alternarTodos}>Selecionar tudo</button>
          </div>
          <div style={styles.checkGrid}>
            {MODULOS.map((modulo) => (
              <label key={modulo.key} style={styles.checkboxItem}>
                <input type="checkbox" checked={Boolean(form.permissoes?.[modulo.key])} onChange={() => alternarModulo(modulo.key)} />
                <span>{modulo.label}</span>
              </label>
            ))}
          </div>
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

const styles = {
  page: { display: 'grid', gap: '16px' },
  title: { margin: 0, fontSize: '1.6rem' },
  subtitle: { margin: '0 0 12px' },
  card: { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' },
  permissoesBox: { marginTop: '16px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px' },
  permissoesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  linkButton: { border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 },
  checkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' },
  checkboxItem: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' },
  button: { marginTop: '14px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' },
  error: { color: '#dc2626', marginBottom: '10px' },
  list: { display: 'grid', gap: '8px' },
  userRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' },
  userActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  muted: { color: '#64748b', fontSize: '13px' },
  badge: { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '999px', fontSize: '12px' },
  smallButton: { border: '1px solid #d1d5db', background: 'white', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' },
};
