export default function UserAccountSection({ conta, onChange, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>2. CONTA</h4>
      <div style={styles.grid}>
        <label style={styles.fieldLabel}>
          Estado
          <select style={styles.input} value={conta.estado} onChange={(e) => onChange("ativo", e.target.value === "ativo")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>

        <label style={styles.fieldLabel}>
          Ultimo acesso
          <input style={{ ...styles.input, ...styles.readOnlyInput }} value={conta.ultimoAcesso} readOnly />
        </label>

        <label style={styles.fieldLabel}>
          Data de criacao
          <input style={{ ...styles.input, ...styles.readOnlyInput }} value={conta.dataCriacao} readOnly />
        </label>

        <input style={styles.input} placeholder="User name" value={conta.username} onChange={(e) => onChange("username", e.target.value)} />
        <input style={styles.input} type="password" placeholder={conta.modoEdicao ? "Password (opcional)" : "Password"} value={conta.password} onChange={(e) => onChange("password", e.target.value)} />
        <input style={styles.input} type="password" placeholder={conta.modoEdicao ? "Confirmar Password (opcional)" : "Confirmar Password"} value={conta.confirmarPassword} onChange={(e) => onChange("confirmarPassword", e.target.value)} />
      </div>
    </section>
  );
}
