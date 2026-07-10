export default function UserOrganizationSection({ organizacao, styles }) {
  // Arquitetura SaaS (futuro): esta secao devera consumir IDs normalizados do ViewModel
  // (empresaId, departamentoId, equipaId, supervisorId) para renderizar labels/relacoes.
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>6. ORGANIZACAO</h4>
      <div style={styles.placeholderGrid}>
        <div style={styles.placeholderBox}><strong>Empresa</strong><span>{organizacao.empresa}</span></div>
        <div style={styles.placeholderBox}><strong>Departamento</strong><span>{organizacao.departamento}</span></div>
        <div style={styles.placeholderBox}><strong>Equipa</strong><span>{organizacao.equipa}</span></div>
        <div style={styles.placeholderBox}><strong>Supervisor</strong><span>{organizacao.supervisor}</span></div>
        <div style={styles.placeholderBox}><strong>Cargo</strong><span>{organizacao.cargo}</span></div>
      </div>
    </section>
  );
}
