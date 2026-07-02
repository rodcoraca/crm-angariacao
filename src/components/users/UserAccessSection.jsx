export default function UserAccessSection({ controloAcesso, onToggleModulo, onToggleTodos, styles }) {
  return (
    <section style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <h4 style={styles.sectionTitle}>4. CONTROLO DE ACESSO</h4>
        <button style={styles.linkButton} onClick={onToggleTodos}>Selecionar tudo</button>
      </div>
      <div style={styles.checkGrid}>
        {controloAcesso.modulos.map((modulo) => (
          <label key={modulo.key} style={styles.checkboxItem}>
            <input type="checkbox" checked={Boolean(controloAcesso.permissoes?.[modulo.key])} onChange={() => onToggleModulo(modulo.key)} />
            <span>{modulo.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
