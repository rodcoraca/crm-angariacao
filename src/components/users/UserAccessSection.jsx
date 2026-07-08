export default function UserAccessSection({
  controloAcesso,
  onToggleModulo,
  onToggleGrupo,
  onTogglePermissao,
  onToggleTodos,
  styles
}) {
  const allPermissions = controloAcesso.modulos.flatMap((modulo) =>
    modulo.groups.flatMap((grupo) => grupo.permissions.map((permission) => permission.code))
  );

  const totalSelecionadas = allPermissions.filter((code) => Boolean(controloAcesso.permissoes?.[code])).length;

  function bindIndeterminate(element, isIndeterminate) {
    if (!element) return;
    element.indeterminate = Boolean(isIndeterminate);
  }

  function getGroupState(grupo) {
    const permissionCodes = grupo.permissions.map((permission) => permission.code);
    const total = permissionCodes.length;
    const checked = permissionCodes.filter((code) => Boolean(controloAcesso.permissoes?.[code])).length;

    return {
      checked: total > 0 && checked === total,
      indeterminate: checked > 0 && checked < total
    };
  }

  function getModuleState(modulo) {
    const permissionCodes = modulo.groups.flatMap((grupo) => grupo.permissions.map((permission) => permission.code));
    const total = permissionCodes.length;
    const checked = permissionCodes.filter((code) => Boolean(controloAcesso.permissoes?.[code])).length;

    return {
      checked: total > 0 && checked === total,
      indeterminate: checked > 0 && checked < total
    };
  }

  return (
    <section style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <h4 style={styles.sectionTitle}>4. CONTROLO DE ACESSO</h4>
        <button style={styles.linkButton} onClick={onToggleTodos}>Selecionar tudo</button>
      </div>

      <p style={styles.helperText}>Selecionadas: {totalSelecionadas} de {allPermissions.length}</p>

      <div style={{ display: "grid", gap: "10px" }}>
        {controloAcesso.modulos.map((modulo) => {
          const moduleState = getModuleState(modulo);

          return (
            <div key={modulo.key} style={{ border: "1px solid rgba(148, 163, 184, 0.35)", borderRadius: "8px", padding: "10px", display: "grid", gap: "8px" }}>
              <label style={{ ...styles.checkboxItem, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={moduleState.checked}
                  ref={(element) => bindIndeterminate(element, moduleState.indeterminate)}
                  onChange={() => onToggleModulo(modulo.key)}
                />
                <span>{modulo.label}</span>
              </label>

              <div style={{ display: "grid", gap: "8px", paddingLeft: "18px" }}>
                {modulo.groups.map((grupo) => {
                  const groupState = getGroupState(grupo);

                  return (
                    <div key={grupo.key} style={{ display: "grid", gap: "6px" }}>
                      <label style={{ ...styles.checkboxItem, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={groupState.checked}
                          ref={(element) => bindIndeterminate(element, groupState.indeterminate)}
                          onChange={() => onToggleGrupo(modulo.key, grupo.key)}
                        />
                        <span>{grupo.label}</span>
                      </label>

                      <div style={{ ...styles.checkGrid, paddingLeft: "18px" }}>
                        {grupo.permissions.map((permission) => (
                          <label key={permission.code} style={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              checked={Boolean(controloAcesso.permissoes?.[permission.code])}
                              onChange={() => onTogglePermissao(permission.code)}
                            />
                            <span>{permission.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

