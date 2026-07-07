export default function UserAccountSection({ conta, onChange, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>2. CONTA</h4>
      <div style={styles.accountGrid}>
        <label style={styles.accountFieldLabel}>
          Estado
          <select style={styles.input} value={conta.estado} onChange={(e) => onChange("ativo", e.target.value === "ativo")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>

        <label style={styles.accountFieldLabel}>
          Ultimo acesso
          <input style={{ ...styles.input, ...styles.readOnlyInput }} value={conta.ultimoAcesso} readOnly />
        </label>

        <label style={styles.accountFieldLabel}>
          Data de criacao
          <input style={{ ...styles.input, ...styles.readOnlyInput }} value={conta.dataCriacao} readOnly />
        </label>

        <label style={styles.accountFieldLabel}>
          User name
          <input style={styles.input} value={conta.username} onChange={(e) => onChange("username", e.target.value)} />
        </label>

        <label style={styles.accountFieldLabel}>
          Password
          <input style={styles.input} type="password" placeholder={conta.modoEdicao ? "Opcional" : "Obrigatória"} value={conta.password} onChange={(e) => onChange("password", e.target.value)} />
        </label>

        <label style={styles.accountFieldLabel}>
          Confirmar Password
          <input style={styles.input} type="password" placeholder={conta.modoEdicao ? "Opcional" : "Obrigatória"} value={conta.confirmarPassword} onChange={(e) => onChange("confirmarPassword", e.target.value)} />
        </label>
      </div>
    </section>
  );
}
