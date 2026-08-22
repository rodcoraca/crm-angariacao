import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useTheme } from "../../theme/ThemeContext";
import { supabase } from "../../supabase";
import { resolveEmpresaId } from "../../utils/empresaScope";
import { loadProfile, saveProfile } from "../../providers/services/providers/ProviderSyncProfileService";
import { getProviderSyncStatus } from "../../providers/services/providers/providerSyncService";
import imovirtualLogo from "../../assets/imovirtual.jpg";
import custojustoLogo from "../../assets/custojusto.jpg";

const DEFAULT_PROVIDERS = [
  { value: "imovirtual", label: "Imovirtual" },
  { value: "custojusto", label: "CustoJusto" }
];

const PROVIDER_LOGOS = {
  imovirtual: imovirtualLogo,
  custojusto: custojustoLogo
};

function getProviderLogo(providerValue) {
  const normalized = String(providerValue || "").trim().toLowerCase();
  return PROVIDER_LOGOS[normalized] || null;
}

export default function SyncPreparationModal({
  open,
  onClose,
  onConfirm,
  providers = DEFAULT_PROVIDERS
}) {
  const theme = useTheme();
  const availableProviders = Array.isArray(providers) && providers.length > 0 ? providers : DEFAULT_PROVIDERS;
  const allProviderValues = useMemo(() => availableProviders.map((providerItem) => providerItem.value), [availableProviders]);
  const [selectedProviders, setSelectedProviders] = useState(() => [...allProviderValues]);
  const [providerStatuses, setProviderStatuses] = useState({});
  const [districts, setDistricts] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [districtQuery, setDistrictQuery] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtsError, setDistrictsError] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [includePrivateOwners, setIncludePrivateOwners] = useState(true);
  const [includeProfessionalOwners, setIncludeProfessionalOwners] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const formatShortDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (input) => String(input).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getProviderStatusText = (status) => {
    if (!status) return "Estado indisponível";
    if (status.sync_running) return "Em atualização";
    if (status.canSync) return "Disponível";
    if (status.next_execution) return `Disponível novamente às ${formatShortDateTime(status.next_execution)}`;
    if (!status.last_execution) return "Ainda não atualizado";
    return "Estado indisponível";
  };

  const eligibleProviderValues = useMemo(
    () => availableProviders
      .filter((providerItem) => {
        const status = providerStatuses[providerItem.value];
        return Boolean(status?.canSync) && !status?.sync_running;
      })
      .map((providerItem) => providerItem.value),
    [availableProviders, providerStatuses]
  );
  const eligibleSelectedProviders = selectedProviders.filter((providerValue) => eligibleProviderValues.includes(providerValue));
  const allSelectedProviders = eligibleProviderValues.length > 0 && eligibleProviderValues.every((providerValue) => selectedProviders.includes(providerValue));
  const primaryActionLabel = eligibleSelectedProviders.length === 0
    ? "Nenhum provider selecionado"
    : allSelectedProviders
      ? "Consultar todos os providers"
      : eligibleSelectedProviders.length === 1
        ? "Consultar 1 provider"
        : `Consultar ${eligibleSelectedProviders.length} providers`;

  useEffect(() => {
    if (!open) return;

    setSelectedProviders((current) => {
      if (current.length === 0) {
        return [...allProviderValues];
      }
      return current.filter((value) => allProviderValues.includes(value)).length > 0
        ? current.filter((value) => allProviderValues.includes(value))
        : [...allProviderValues];
    });

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
          loadProfile(allProviderValues[0] || "imovirtual")
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
  }, [open, allProviderValues]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadProviderStatuses = async () => {
      const nextStatuses = {};
      for (const providerItem of availableProviders) {
        try {
          const status = await getProviderSyncStatus(providerItem.value);
          if (active) {
            nextStatuses[providerItem.value] = status;
          }
        } catch (error) {
          if (active) {
            nextStatuses[providerItem.value] = null;
          }
        }
      }
      if (active) {
        setProviderStatuses(nextStatuses);
      }
    };

    void loadProviderStatuses();

    return () => {
      active = false;
    };
  }, [open, availableProviders]);

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

  function toggleProvider(providerValue) {
    setSelectedProviders((current) => {
      const isSelected = current.includes(providerValue);
      const next = isSelected
        ? current.filter((item) => item !== providerValue)
        : [...current, providerValue];
      return next;
    });
  }

  function toggleAllProviders() {
    if (eligibleProviderValues.length === 0) {
      return;
    }

    setSelectedProviders((current) => {
      if (allSelectedProviders) {
        return current.filter((providerValue) => !eligibleProviderValues.includes(providerValue));
      }

      return Array.from(new Set([...current.filter((providerValue) => !eligibleProviderValues.includes(providerValue)), ...eligibleProviderValues]));
    });
  }

  async function handleConfirm() {
    const toConfirm = selectedProviders.filter((providerValue) => eligibleProviderValues.includes(providerValue));
    if (confirming || toConfirm.length === 0) return;
    setConfirming(true);

    try {
      if (saveAsDefault) {
        for (const providerValue of toConfirm) {
          await saveProfile(providerValue, {
            districts: selectedDistricts,
            advertisers: {
              private: includePrivateOwners,
              professional: includeProfessionalOwners
            }
          });
        }
      }

      await onConfirm?.({
        providers: toConfirm,
        districts: selectedDistricts,
        tipologia,
        minPrice,
        maxPrice,
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
    <>
      <style>{`
        .sync-modal-provider-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sync-provider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid ${theme.colors.border};
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surface};
        }

        .sync-provider-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .sync-provider-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          color: ${theme.colors.muted};
          font-size: 0.78rem;
          text-align: right;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .sync-provider-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .sync-provider-meta {
            align-items: flex-start;
            text-align: left;
            width: 100%;
          }
        }
      `}</style>
      <Modal
        open={open}
        title="Preparar sincronização"
        size="xl"
        onClose={onClose}
        closeOnBackdrop={!loadingDistricts}
        style={{ width: "min(1000px, calc(100vw - 32px))", maxWidth: "min(1000px, calc(100vw - 32px))" }}
        footer={(
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              variant="secondary"
              onClick={handleConfirm}
              disabled={loadingDistricts || Boolean(districtsError) || confirming || eligibleSelectedProviders.length === 0}
              loading={confirming}
              style={{ minWidth: "180px" }}
            >
              {primaryActionLabel}
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
            eligibleSelectedProviders.length > 0
              ? eligibleSelectedProviders.map((value) => availableProviders.find((providerItem) => providerItem.value === value)?.label || value).join(", ")
              : null,
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.sm, alignItems: "baseline", marginBottom: theme.spacing.xs }}>
          <strong id="sync-provider-label">Providers</strong>
          <span style={{ color: theme.colors.muted, fontSize: theme.typography.caption?.fontSize || "0.8rem" }}>
            {eligibleSelectedProviders.length} de {availableProviders.length}
          </span>
        </div>

        <div className="sync-modal-provider-list" style={{ marginBottom: theme.spacing.sm }}>
          <label style={{ ...labelStyle, justifyContent: "space-between", width: "100%" }}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <input
                type="checkbox"
                checked={allSelectedProviders}
                disabled={eligibleProviderValues.length === 0}
                onChange={toggleAllProviders}
              />
              <span>Todos</span>
            </span>
          </label>

          {availableProviders.map((providerItem) => {
            const status = providerStatuses[providerItem.value];
            const lastUpdatedLabel = status?.last_execution ? formatShortDateTime(status.last_execution) : "Ainda não atualizado";
            const statusText = getProviderStatusText(status);
            const isEligible = Boolean(status?.canSync) && !status?.sync_running;
            const isChecked = selectedProviders.includes(providerItem.value);
            const logoUrl = getProviderLogo(providerItem.value);

            return (
              <label key={providerItem.value} className="sync-provider-row" title={providerItem.label}>
                <span className="sync-provider-main">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isEligible}
                    onChange={() => toggleProvider(providerItem.value)}
                  />
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={providerItem.label}
                      title={providerItem.label}
                      style={{ width: 80, height: 80, objectFit: "contain", display: "block", borderRadius: 4 }}
                    />
                  ) : (
                    <span>{providerItem.label}</span>
                  )}
                </span>
                <span className="sync-provider-meta">
                  <span>Última atualização: {lastUpdatedLabel}</span>
                  <span>{statusText}</span>
                </span>
              </label>
            );
          })}
        </div>
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
    </>
  );
}
