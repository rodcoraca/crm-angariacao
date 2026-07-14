function resolveStatusLabel(status) {
  if (status === "pending_activation") return "Pendente ativação";
  if (status === "disabled") return "Desativado";
  return "Ativo";
}

export default function UserAccountSection({ conta, onChange, onResendInvite = null, resendInviteLoading = false, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>2. CONTA</h4>
      <div style={styles.accountGrid}>
        <label style={styles.accountFieldLabel}>
          Estado
          <select style={styles.input} value={conta.estado} onChange={(e) => onChange("account_status", e.target.value)}>
            <option value="pending_activation">Pendente ativação</option>
            <option value="active">Ativo</option>
            <option value="disabled">Desativado</option>
          </select>
          <span style={styles.helperText}>Estado atual: {resolveStatusLabel(conta.estado)}</span>
          <span style={styles.helperText}>Estado administrativo: {conta.estadoAdministrativoLabel || "Ativo"}</span>
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
          <span style={styles.helperText}>Deixe em branco para manter a palavra-passe atual.</span>
        </label>

        <label style={styles.accountFieldLabel}>
          Confirmar Password
          <input style={styles.input} type="password" placeholder={conta.modoEdicao ? "Opcional" : "Obrigatória"} value={conta.confirmarPassword} onChange={(e) => onChange("confirmarPassword", e.target.value)} />
        </label>

        {conta.modoEdicao && onResendInvite ? (
          <label style={styles.accountFieldLabel}>
            Convite de ativação
            <button
              type="button"
              style={styles.smallButton}
              onClick={onResendInvite}
              disabled={resendInviteLoading}
            >
              {resendInviteLoading ? "A enviar..." : "Reenviar convite"}
            </button>
          </label>
        ) : null}
      </div>
    </section>
  );
}
