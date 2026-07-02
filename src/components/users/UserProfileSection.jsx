export default function UserProfileSection({ perfil, onChangePerfil, styles }) {
  return (
    <section style={styles.sectionCard}>
      <h4 style={styles.sectionTitle}>3. PERFIL</h4>
      <p style={styles.helperText}>{perfil.descricao}</p>
      <label style={styles.fieldLabel}>
        Perfil
        <select style={styles.input} value={perfil.valor} onChange={(e) => onChangePerfil(e.target.value)}>
          <option value="">Selecionar perfil</option>
          {perfil.opcoes.map((perfilOpcao) => (
            <option key={perfilOpcao} value={perfilOpcao}>
              {perfilOpcao}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
