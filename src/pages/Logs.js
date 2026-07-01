import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const PAGE_SIZE = 50;

export default function Logs({ modo = 'geral', onModoChange }) {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    setUsuarioSelecionadoId(null);
    carregarLogs({ reset: true, userId: null });
  }, [modo]);

  useEffect(() => {
    if (modo !== 'utilizadores') return;
    carregarLogs({ reset: true, userId: usuarioSelecionadoId });
  }, [modo, usuarioSelecionadoId]);

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, apelido, email, username')
      .order('nome', { ascending: true });

    if (!error) {
      setUsuarios(data || []);
    }
  }

  async function carregarLogs({ reset = false, userId = null } = {}) {
    if (reset) {
      setLoading(true);
      setLogs([]);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const targetPage = reset ? 1 : page + 1;
    const offset = (targetPage - 1) * PAGE_SIZE;

    let query = supabase
      .from('logs_navegacao')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (userId) {
      query = query.eq('usuario_id', userId);
    }

    const { data, error } = await query;

    if (!error) {
      const proximoBatch = data || [];
      setLogs((prev) => (reset ? proximoBatch : [...prev, ...proximoBatch]));
      setHasMore(proximoBatch.length === PAGE_SIZE);
      setPage(targetPage);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  function nomeUsuario(usuario) {
    if (!usuario) return 'Utilizador desconhecido';
    return `${usuario.nome || ''} ${usuario.apelido || ''}`.trim() || usuario.email || usuario.username || 'Utilizador desconhecido';
  }

  const usuarioSelecionado = usuarios.find((usuario) => usuario.id === usuarioSelecionadoId) || null;

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Logs de navegação</h2>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(modo === 'geral' ? styles.tabActive : {}) }}
            onClick={() => onModoChange?.('geral')}
          >
            Lista de logs
          </button>
          <button
            style={{ ...styles.tab, ...(modo === 'utilizadores' ? styles.tabActive : {}) }}
            onClick={() => onModoChange?.('utilizadores')}
          >
            Por utilizador
          </button>
        </div>
      </div>

      <div style={styles.card}>
        {modo === 'utilizadores' ? (
          <>
            <p style={styles.helper}>Selecione um utilizador para ver os seus logs, do mais recente para o mais antigo.</p>
            <div style={styles.userGrid}>
              {usuarios.map((usuario) => (
                <button
                  key={usuario.id}
                  style={{ ...styles.userCard, ...(usuarioSelecionadoId === usuario.id ? styles.userCardActive : {}) }}
                  onClick={() => setUsuarioSelecionadoId(usuario.id)}
                >
                  <strong>{nomeUsuario(usuario)}</strong>
                  <span style={styles.userMeta}>{usuario.email || usuario.username || 'Sem contacto'}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={styles.helper}>A lista carrega 50 registos por vez, do mais recente para o mais antigo.</p>
        )}

        {loading ? <p>A carregar...</p> : null}

        {modo === 'utilizadores' && !usuarioSelecionadoId ? null : (
          <div style={styles.list}>
            {logs.map((log) => {
              const usuario = usuarios.find((item) => item.id === log.usuario_id) || null;
              return (
                <div key={log.id} style={styles.row}>
                  <div style={styles.content}>
                    <div style={styles.userLine}>
                      <strong>{nomeUsuario(usuario)}</strong>
                      <span style={styles.badge}>{log.acao || 'Alteração'}</span>
                    </div>
                    <div style={styles.muted}>{log.detalhes || 'Sem detalhes'}</div>
                  </div>
                  <div style={styles.meta}>{new Date(log.created_at).toLocaleString('pt-PT')}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && logs.length === 0 && !usuarioSelecionadoId && modo === 'utilizadores' ? (
          <p style={styles.empty}>Selecione um utilizador para ver os logs.</p>
        ) : null}

        {!loading && logs.length === 0 && modo === 'geral' ? (
          <p style={styles.empty}>Ainda não existem logs para mostrar.</p>
        ) : null}

        {hasMore && !loading ? (
          <button style={styles.loadMore} onClick={() => carregarLogs({ reset: false, userId: usuarioSelecionadoId })} disabled={loadingMore}>
            {loadingMore ? 'A carregar...' : 'Carregar mais 50'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'grid', gap: '16px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.6rem' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: { border: '1px solid #cbd5e1', background: 'white', borderRadius: '999px', padding: '8px 12px', cursor: 'pointer', color: '#334155' },
  tabActive: { background: '#0f172a', color: 'white', borderColor: '#0f172a' },
  card: { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', display: 'grid', gap: '12px' },
  helper: { margin: 0, color: '#475569' },
  userGrid: { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' },
  userCard: { display: 'grid', gap: '4px', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' },
  userCardActive: { borderColor: '#2563eb', background: '#eff6ff' },
  userMeta: { fontSize: '12px', color: '#64748b' },
  list: { display: 'grid', gap: '8px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', gap: '12px' },
  content: { flex: 1 },
  userLine: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  badge: { background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' },
  muted: { color: '#64748b', fontSize: '13px' },
  meta: { fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' },
  empty: { margin: 0, color: '#64748b' },
  loadMore: { justifySelf: 'start', border: '1px solid #cbd5e1', background: 'white', borderRadius: '999px', padding: '8px 12px', cursor: 'pointer' },
};
