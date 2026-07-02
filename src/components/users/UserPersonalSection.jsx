export default function UserPersonalSection({ dadosPessoais, onChange, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>1. DADOS PESSOAIS</h4>
      <div style={styles.grid}>
        <input style={styles.input} placeholder="Nome" value={dadosPessoais.nome} onChange={(e) => onChange("nome", e.target.value)} />
        <input style={styles.input} placeholder="Apelido" value={dadosPessoais.apelido} onChange={(e) => onChange("apelido", e.target.value)} />
        <input style={styles.input} placeholder="Email" value={dadosPessoais.email} onChange={(e) => onChange("email", e.target.value)} />
        <input style={styles.input} placeholder="Telefone" value={dadosPessoais.telefone} onChange={(e) => onChange("telefone", e.target.value)} />
      </div>
    </section>
  );
}
