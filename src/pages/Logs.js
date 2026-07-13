import { useCallback, useEffect, useRef, useState } from 'react';
import { listarTimelineIdentityAccess, listarUtilizadoresIdentityAccess } from '../modules/audit/services';

const PAGE_SIZE = 50;

export default function Logs({ modo = 'geral', onModoChange, currentUser = null }) {
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);
  const pageRef = useRef(0);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const carregarUsuarios = useCallback(async () => {
    const { data, error } = await listarUtilizadoresIdentityAccess({ currentUser });

    if (!error) {
      setUsuarios(data || []);
    }
  }, [currentUser]);

  const carregarLogs = useCallback(async ({ reset = false, userId = null } = {}) => {
    if (reset) {
      setLoading(true);
      setLogs([]);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const targetPage = reset ? 1 : pageRef.current + 1;

    const selectedUser = userId
      ? usuarios.find((usuario) => usuario.id === userId) || null
      : null;

    const { data, error, hasMore: nextHasMore } = await listarTimelineIdentityAccess({
      page: targetPage,
      pageSize: PAGE_SIZE,
      userFilter: selectedUser,
      currentUser
    });

    if (!error) {
      const proximoBatch = data || [];
      setLogs((prev) => (reset ? proximoBatch : [...prev, ...proximoBatch]));
      setHasMore(Boolean(nextHasMore));
      setPage(targetPage);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [usuarios, currentUser]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  useEffect(() => {
    setUsuarioSelecionadoId(null);
    carregarLogs({ reset: true, userId: null });
  }, [carregarLogs, modo, usuarios.length]);

  useEffect(() => {
    if (modo !== 'utilizadores') return;
    carregarLogs({ reset: true, userId: usuarioSelecionadoId });
  }, [carregarLogs, modo, usuarioSelecionadoId]);

  function nomeUsuario(usuario) {
    if (!usuario) return 'Utilizador desconhecido';
    return `${usuario.nome || ''} ${usuario.apelido || ''}`.trim() || usuario.email || usuario.username || 'Utilizador desconhecido';
  }

  function emailUsuario(usuario) {
    if (!usuario) return 'Sem email';
    return usuario.email || usuario.username || 'Sem email';
  }

  function encontrarUsuarioPorLog(log) {
    const logUserId = log?.userId || log?.usuario_id || null;
    if (!logUserId) return null;

    return (
      usuarios.find((item) => item.id === logUserId) ||
      usuarios.find((item) => item.auth_user_id === logUserId) ||
      null
    );
  }

  function formatarAcao(log) {
    if (!log) return 'Alteração';

    if (log.source === 'audit_logs') {
      return `audit:${log.action || 'evento'}`;
    }

    if (log.source === 'user_sessions') {
      return log.action || 'session';
    }

    return log.action || log.acao || 'Alteração';
  }

  function formatarDetalhes(log) {
    if (!log) return 'Sem detalhes';
    return log.details || log.detalhes || 'Sem detalhes';
  }

  function formatarData(log) {
    const raw = log?.createdAt || log?.created_at || null;
    return raw ? new Date(raw).toLocaleString('pt-PT') : 'Data indisponível';
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Auditoria</h2>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(modo === 'geral' ? styles.tabActive : {}) }}
            onClick={() => onModoChange?.('geral')}
          >
            Lista de auditoria
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
                  <span style={styles.userMeta}>{emailUsuario(usuario)}</span>
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
              const usuario = encontrarUsuarioPorLog(log);
              return (
                <div key={log.id || `${log.source}_${log.rawId}`} style={styles.row}>
                  <div style={styles.content}>
                    <div style={styles.userLine}>
                      <strong>{nomeUsuario(usuario)}</strong>
                      {usuario ? <span style={styles.userMeta}>{emailUsuario(usuario)}</span> : null}
                      <span style={styles.badge}>{formatarAcao(log)}</span>
                    </div>
                    <div style={styles.muted}>{formatarDetalhes(log)}</div>
                  </div>
                  <div style={styles.meta}>{formatarData(log)}</div>
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
  tab: { border: '1px solid var(--os-color-border)', background: 'white', borderRadius: '999px', padding: '8px 12px', cursor: 'pointer', color: 'var(--os-color-text)' },
  tabActive: { background: 'var(--os-color-text)', color: 'white', borderColor: 'var(--os-color-text)' },
  card: { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', display: 'grid', gap: '12px' },
  helper: { margin: 0, color: 'var(--os-color-muted)' },
  userGrid: { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' },
  userCard: { display: 'grid', gap: '4px', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--os-color-border)', background: 'var(--os-color-surface-soft)', cursor: 'pointer' },
  userCardActive: { borderColor: 'var(--os-status-info-text)', background: 'var(--os-status-info-surface)' },
  userMeta: { fontSize: '12px', color: 'var(--os-color-muted)' },
  list: { display: 'grid', gap: '8px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--os-color-border)', borderRadius: '8px', gap: '12px' },
  content: { flex: 1 },
  userLine: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  badge: { background: 'var(--os-status-info-surface)', color: 'var(--os-status-info-text)', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' },
  muted: { color: 'var(--os-color-muted)', fontSize: '13px' },
  meta: { fontSize: '13px', color: 'var(--os-color-muted)', whiteSpace: 'nowrap' },
  empty: { margin: 0, color: 'var(--os-color-muted)' },
  loadMore: { justifySelf: 'start', border: '1px solid var(--os-color-border)', background: 'white', borderRadius: '999px', padding: '8px 12px', cursor: 'pointer' },
};


