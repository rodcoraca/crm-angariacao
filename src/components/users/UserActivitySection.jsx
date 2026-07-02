export default function UserActivitySection({ atividade, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>5. ATIVIDADE</h4>
      <div style={styles.placeholderGrid}>
        <div style={styles.placeholderBox}><strong>Ultimo acesso</strong><span>{atividade.ultimoAcesso}</span></div>
        <div style={styles.placeholderBox}><strong>Ultima acao</strong><span>{atividade.ultimaAcao}</span></div>
        <div style={styles.placeholderBox}><strong>Numero de acessos</strong><span>{atividade.numeroAcessos}</span></div>
      </div>
    </section>
  );
}
