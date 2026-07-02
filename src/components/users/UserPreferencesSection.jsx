export default function UserPreferencesSection({ preferencias, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>7. PREFERENCIAS</h4>
      <div style={styles.placeholderGrid}>
        <div style={styles.placeholderBox}><strong>Idioma</strong><span>{preferencias.idioma}</span></div>
        <div style={styles.placeholderBox}><strong>Tema</strong><span>{preferencias.tema}</span></div>
        <div style={styles.placeholderBox}><strong>Pagina Inicial</strong><span>{preferencias.paginaInicial}</span></div>
        <div style={styles.placeholderBox}><strong>Formato Data</strong><span>{preferencias.formatoData}</span></div>
        <div style={styles.placeholderBox}><strong>Notificacoes</strong><span>{preferencias.notificacoes}</span></div>
      </div>
    </section>
  );
}
