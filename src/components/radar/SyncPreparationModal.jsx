import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useTheme } from "../../theme/ThemeContext";
import { supabase } from "../../supabase";
import { resolveEmpresaId } from "../../utils/empresaScope";
import { loadProfile, saveProfile } from "../../providers/services/providers/ProviderSyncProfileService";

const DEFAULT_PROVIDERS = [
  { value: "imovirtual", label: "Imovirtual" }
];

export default function SyncPreparationModal({
  open,
  onClose,
  onConfirm,
  providers = DEFAULT_PROVIDERS
}) {
  const theme = useTheme();
  const [provider, setProvider] = useState(providers[0]?.value || "imovirtual");
  const [districts, setDistricts] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [districtQuery, setDistrictQuery] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtsError, setDistrictsError] = useState("");
  const [includePrivateOwners, setIncludePrivateOwners] = useState(true);
  const [includeProfessionalOwners, setIncludeProfessionalOwners] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setDistrictQuery("");
    setDistrictsError("");
    setLoadingDistricts(true);

    async function loadDistricts() {
      try {
        const empresaId = await resolveEmpresaId();
        if (!empresaId) {
          throw new Error("Não foi possível identificar a empresa actual.");
        }

        const [{ data, error }, savedProfile] = await Promise.all([
          supabase.rpc("radar_get_filter_options", {
            p_empresa_id: empresaId,
            p_district: null,
            p_provider: null,
            p_estado: null,
            p_is_private: null,
            p_date_after: null,
            p_date_before: null
          }),
          loadProfile(provider)
        ]);

        if (error) throw error;
        if (!active) return;

        const availableDistricts = Array.from(new Set(
          (data?.districts || [])
            .map((district) => String(district || "").trim())
            .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, "pt-PT"));

        setDistricts(availableDistricts);

        if (savedProfile?.districts && Array.isArray(savedProfile.districts)) {
          // Filtrar apenas distritos que ainda existem na base de dados
          const saved = savedProfile.districts.filter((d) => availableDistricts.includes(d));
          setSelectedDistricts(saved.length > 0 ? saved : availableDistricts);
        } else {
          setSelectedDistricts(availableDistricts);
        }

        if (savedProfile?.advertisers) {
          if (typeof savedProfile.advertisers.private === "boolean") {
            setIncludePrivateOwners(savedProfile.advertisers.private);
          }
          if (typeof savedProfile.advertisers.professional === "boolean") {
            setIncludeProfessionalOwners(savedProfile.advertisers.professional);
          }
        }
      } catch (error) {
        if (!active) return;
        setDistricts([]);
        setSelectedDistricts([]);
        setDistrictsError(error?.message || "Não foi possível carregar os distritos.");
      } finally {
        if (active) setLoadingDistricts(false);
      }
    }

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [open, provider]);

  const visibleDistricts = useMemo(() => {
    const query = districtQuery.trim().toLocaleLowerCase("pt-PT");
    if (!query) return districts;
    return districts.filter((district) => district.toLocaleLowerCase("pt-PT").includes(query));
  }, [districtQuery, districts]);

  const selectedDistrictSet = useMemo(() => new Set(selectedDistricts), [selectedDistricts]);
  const allDistrictsSelected = districts.length > 0 && selectedDistricts.length === districts.length;

  function toggleDistrict(district) {
    setSelectedDistricts((current) => current.includes(district)
      ? current.filter((item) => item !== district)
      : [...current, district]);
  }

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);

    try {
      if (saveAsDefault) {
        await saveProfile(provider, {
          districts: selectedDistricts,
          advertisers: {
            private: includePrivateOwners,
            professional: includeProfessionalOwners
          }
        });
      }

      await onConfirm?.({
        provider,
        districts: selectedDistricts,
        includePrivateOwners,
        includeProfessionalOwners,
        saveAsDefault
      });
    } finally {
      setConfirming(false);
    }
  }

  const sectionStyle = {
    borderTop: `1px solid ${theme.colors.border}`,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md
  };

  const labelStyle = {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    cursor: "pointer"
  };

  const controlStyle = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "38px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    background: theme.colors.surface,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.fontSize,
    padding: `0 ${theme.spacing.sm}`
  };

  return (
    <Modal
      open={open}
      title="Preparar sincronização"
      size="md"
      onClose={onClose}
      closeOnBackdrop={!loadingDistricts}
      footer={(
        <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="secondary"
            onClick={handleConfirm}
            disabled={loadingDistricts || Boolean(districtsError) || confirming}
            loading={confirming}
          >
            Sincronizar
          </Button>
        </div>
      )}
    >
      <p style={{ margin: 0, color: theme.colors.muted, fontSize: theme.typography.body.fontSize }}>
        Seleccione o âmbito desta sincronização.
      </p>

      {!loadingDistricts && !districtsError ? (
        <p style={{
          margin: `${theme.spacing.xs} 0 0`,
          fontSize: theme.typography?.caption?.fontSize ?? "0.8rem",
          color: theme.colors.muted
        }}>
          {[
            providers.find((p) => p.value === provider)?.label || provider,
            selectedDistricts.length > 0 ? selectedDistricts.join(", ") : null,
            (includePrivateOwners && includeProfessionalOwners)
              ? "Particulares e Profissionais"
              : includePrivateOwners
                ? "Particulares"
                : includeProfessionalOwners
                  ? "Profissionais"
                  : null
          ].filter(Boolean).join(" \u203a ")}
        </p>
      ) : null}

      <section style={sectionStyle} aria-labelledby="sync-provider-label">
        <label id="sync-provider-label" style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600 }}>
          Provider
        </label>
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          style={controlStyle}
        >
          {providers.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </section>

      <section style={sectionStyle} aria-labelledby="sync-districts-label">
        <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.sm, alignItems: "baseline", marginBottom: theme.spacing.xs }}>
          <strong id="sync-districts-label">Distritos</strong>
          {!loadingDistricts && !districtsError ? (
            <span style={{ color: theme.colors.muted, fontSize: theme.typography.caption?.fontSize || "0.8rem" }}>
              {selectedDistricts.length} de {districts.length}
            </span>
          ) : null}
        </div>

        {loadingDistricts ? (
          <p style={{ margin: 0, color: theme.colors.muted }}>A carregar distritos...</p>
        ) : districtsError ? (
          <p role="alert" style={{ margin: 0, color: theme.colors.danger }}>{districtsError}</p>
        ) : districts.length === 0 ? (
          <p style={{ margin: 0, color: theme.colors.muted }}>Não existem distritos disponíveis para esta empresa.</p>
        ) : (
          <>
            <input
              type="search"
              value={districtQuery}
              onChange={(event) => setDistrictQuery(event.target.value)}
              placeholder="Pesquisar distrito..."
              aria-label="Pesquisar distrito"
              style={{ ...controlStyle, marginBottom: theme.spacing.sm }}
            />
            <div style={{ display: "flex", gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDistricts(districts)} disabled={allDistrictsSelected}>
                Seleccionar todos
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDistricts([])} disabled={selectedDistricts.length === 0}>
                Limpar selecção
              </Button>
            </div>
            <div style={{
              maxHeight: "172px",
              overflowY: "auto",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.sm,
              padding: theme.spacing.xs,
              display: "flex",
              flexDirection: "column",
              gap: "2px"
            }}>
              {visibleDistricts.length > 0 ? visibleDistricts.map((district) => (
                <label key={district} style={{ ...labelStyle, padding: `${theme.spacing.xs} ${theme.spacing.sm}` }}>
                  <input
                    type="checkbox"
                    checked={selectedDistrictSet.has(district)}
                    onChange={() => toggleDistrict(district)}
                  />
                  <span>{district}</span>
                </label>
              )) : (
                <p style={{ margin: theme.spacing.sm, color: theme.colors.muted }}>Nenhum distrito encontrado.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section style={sectionStyle} aria-labelledby="sync-advertiser-label">
        <strong id="sync-advertiser-label" style={{ display: "block", marginBottom: theme.spacing.sm }}>Tipo de anunciante</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <label style={labelStyle}>
            <input type="checkbox" checked={includePrivateOwners} onChange={(event) => setIncludePrivateOwners(event.target.checked)} />
            Particulares
          </label>
          <label style={labelStyle}>
            <input type="checkbox" checked={includeProfessionalOwners} onChange={(event) => setIncludeProfessionalOwners(event.target.checked)} />
            Profissionais
          </label>
        </div>
      </section>

      <label style={{ ...labelStyle, ...sectionStyle }}>
        <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} />
        Guardar esta selecção como padrão
      </label>
    </Modal>
  );
}
