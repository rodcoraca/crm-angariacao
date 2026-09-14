import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useTheme } from "../../theme/ThemeContext";
import { supabase } from "../../supabase";
import { resolveEmpresaId } from "../../utils/empresaScope";
import { loadProfile, saveProfile } from "../../providers/services/providers/ProviderSyncProfileService";
import { getProviderSyncStatuses } from "../../providers/services/providers/providerSyncService";
import imovirtualLogo from "../../assets/imovirtual.jpg";
import custojustoLogo from "../../assets/custojusto.jpg";
import idealistaLogo from "../../assets/idealista.jpg";
import olxLogo from "../../assets/olx.jpg";

const DEFAULT_PROVIDERS = [
  { value: "imovirtual", label: "Imovirtual" },
  { value: "custojusto", label: "CustoJusto" },
  { value: "olx", label: "OLX" },
  { value: "idealista", label: "Idealista" }
];

const PROVIDER_ORDER = ["imovirtual", "custojusto", "olx", "idealista"];

const PROVIDER_LOGOS = {
  imovirtual: imovirtualLogo,
  custojusto: custojustoLogo,
  idealista: idealistaLogo,
  olx: olxLogo
};

function normalizeProviderValue(providerValue) {
  return String(providerValue || "").trim().toLowerCase();
}

function isDisabledProvider(providerItem) {
  const providerValue = normalizeProviderValue(providerItem?.value);
  return Boolean(providerItem?.disabled || providerItem?.comingSoon) || providerValue === "idealista";
}

function getProviderLogo(providerValue) {
  return PROVIDER_LOGOS[normalizeProviderValue(providerValue)] || null;
}

export default function SyncPreparationModal({
  open,
  onClose,
  onConfirm,
  providers = DEFAULT_PROVIDERS
}) {
  const theme = useTheme();
  const availableProviders = useMemo(() => {
    const source = Array.isArray(providers) && providers.length > 0 ? providers : DEFAULT_PROVIDERS;
    return [...source].sort((left, right) => {
      const leftIndex = PROVIDER_ORDER.indexOf(normalizeProviderValue(left.value));
      const rightIndex = PROVIDER_ORDER.indexOf(normalizeProviderValue(right.value));
      return (leftIndex < 0 ? PROVIDER_ORDER.length : leftIndex) - (rightIndex < 0 ? PROVIDER_ORDER.length : rightIndex);
    });
  }, [providers]);
  const allProviderValues = useMemo(
    () => availableProviders.map((providerItem) => normalizeProviderValue(providerItem.value)),
    [availableProviders]
  );
  const selectableProviderValues = useMemo(
    () => availableProviders
      .filter((providerItem) => !isDisabledProvider(providerItem))
      .map((providerItem) => normalizeProviderValue(providerItem.value)),
    [availableProviders]
  );
  const [selectedProviders, setSelectedProviders] = useState(() => [...allProviderValues]);
  const [providerStatuses, setProviderStatuses] = useState({});
  const [districts, setDistricts] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [districtQuery, setDistrictQuery] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtsError, setDistrictsError] = useState("");
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

  const getProviderStatusText = (status, providerValue) => {
    if (normalizeProviderValue(providerValue) === "idealista") return "Em Breve";
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
        const providerValue = normalizeProviderValue(providerItem.value);
        if (providerValue === "idealista") {
          return false;
        }
        const status = providerStatuses[providerValue];
        return Boolean(status?.canSync) && !status?.sync_running;
      })
      .map((providerItem) => normalizeProviderValue(providerItem.value)),
    [availableProviders, providerStatuses]
  );
  const effectiveSelectedProviders = selectedProviders
    .map(normalizeProviderValue)
    .filter(Boolean);
  const eligibleSelectedProviders = effectiveSelectedProviders
    .filter((providerValue) => eligibleProviderValues.includes(providerValue));
  const selectedSelectableProviderCount = selectableProviderValues
    .filter((providerValue) => effectiveSelectedProviders.includes(providerValue))
    .length;
  const allSelectedProviders = selectableProviderValues.length > 0
    && selectedSelectableProviderCount === selectableProviderValues.length;
  const someSelectedProviders = selectedSelectableProviderCount > 0 && !allSelectedProviders;
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
      const normalizedCurrent = current
        .map(normalizeProviderValue)
          .filter((value) => Boolean(value) && selectableProviderValues.includes(value));

      if (normalizedCurrent.length === 0) {
          return [...selectableProviderValues];
      }

        return normalizedCurrent.length > 0 ? normalizedCurrent : [...selectableProviderValues];
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
  }, [open, allProviderValues, selectableProviderValues]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const loadProviderStatuses = async () => {
      const nextStatuses = {};
      try {
        const providerValues = availableProviders.map((providerItem) => normalizeProviderValue(providerItem.value));
        Object.assign(nextStatuses, await getProviderSyncStatuses(providerValues));
      } catch (error) {
        availableProviders.forEach((providerItem) => {
          nextStatuses[normalizeProviderValue(providerItem.value)] = null;
        });
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
    const normalizedProviderValue = normalizeProviderValue(providerValue);
    const providerItem = availableProviders.find(
      (item) => normalizeProviderValue(item.value) === normalizedProviderValue
    );
    if (!providerItem || isDisabledProvider(providerItem)) {
      return;
    }

    setSelectedProviders((current) => {
      const normalizedCurrent = current.map(normalizeProviderValue);
      const isSelected = normalizedCurrent.includes(normalizedProviderValue);
      const next = isSelected
        ? normalizedCurrent.filter((item) => item !== normalizedProviderValue)
        : [...normalizedCurrent, normalizedProviderValue];
      return next;
    });
  }

  function toggleAllProviders() {
    if (selectableProviderValues.length === 0) {
      return;
    }

    setSelectedProviders((current) => {
      const normalizedCurrent = current.map(normalizeProviderValue);

      if (allSelectedProviders) {
        return normalizedCurrent.filter((providerValue) => !selectableProviderValues.includes(providerValue));
      }

      return Array.from(new Set([
        ...normalizedCurrent.filter((providerValue) => !selectableProviderValues.includes(providerValue)),
        ...selectableProviderValues
      ]));
    });
  }

  async function handleConfirm() {
    const toConfirm = selectedProviders
      .map(normalizeProviderValue)
      .filter((providerValue) => eligibleProviderValues.includes(providerValue));
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
        includePrivateOwners,
        includeProfessionalOwners,
        saveAsDefault
      });
    } finally {
      setConfirming(false);
    }
  }

  const sectionStyle = {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    minWidth: 0
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

  const compactLabelStyle = {
    ...labelStyle,
    gap: theme.spacing.xs,
    fontSize: theme.typography.caption?.fontSize || "0.8rem"
  };

  return (
    <>
      <style>{`
        .sync-modal-content {
          display: grid;
          gap: ${theme.spacing.sm};
        }

        .sync-modal-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${theme.spacing.sm};
          flex-wrap: wrap;
          color: ${theme.colors.muted};
          font-size: ${theme.typography.caption?.fontSize || "0.8rem"};
        }

        .sync-modal-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${theme.spacing.sm};
          margin-bottom: ${theme.spacing.xs};
        }

        .sync-modal-provider-list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: ${theme.spacing.xs};
        }

        .sync-provider-row {
          display: grid;
          grid-template-rows: auto auto auto;
          gap: 4px;
          min-width: 0;
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          border: 1px solid ${theme.colors.border};
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surface};
          cursor: pointer;
        }

        .sync-provider-row:focus-within {
          outline: 2px solid ${theme.colors.accent};
          outline-offset: 1px;
        }

        .sync-provider-main {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-rows: 52px auto;
          align-items: center;
          column-gap: ${theme.spacing.xs};
          min-width: 0;
        }

        .sync-provider-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          grid-column: 2;
          grid-row: 1;
          width: 100%;
          height: 52px;
          overflow: hidden;
        }

        .sync-provider-logo-imovirtual img {
          max-width: 154px;
          max-height: 34px;
        }

        .sync-provider-logo-custojusto img {
          max-width: 142px;
          max-height: 36px;
          transform: scale(1.16);
        }

        .sync-provider-logo-olx img {
          max-width: 44px;
          max-height: 44px;
          transform: scale(0.86);
        }

        .sync-provider-logo-idealista img {
          max-width: 124px;
          max-height: 42px;
          transform: scale(1.3);
        }

        .sync-provider-logo img {
          display: block;
          width: auto;
          height: auto;
          max-width: 150px;
          max-height: 44px;
          object-fit: contain;
        }

        .sync-provider-name {
          grid-column: 2;
          grid-row: 2;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-height: 1.25em;
          font-weight: 600;
        }

        .sync-provider-meta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          justify-content: initial;
          gap: ${theme.spacing.xs};
          color: ${theme.colors.muted};
          font-size: ${theme.typography.caption?.fontSize || "0.8rem"};
          min-width: 0;
        }

        .sync-provider-status {
          min-width: 0;
          overflow-wrap: anywhere;
          white-space: normal;
          line-height: 1.25;
        }

        .sync-modal-district-toolbar {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) auto;
          gap: ${theme.spacing.xs};
          align-items: center;
          margin-bottom: ${theme.spacing.xs};
        }

        .sync-modal-district-actions {
          display: flex;
          gap: ${theme.spacing.xs};
          flex-wrap: wrap;
        }

        .sync-modal-district-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2px;
          max-height: 154px;
          overflow-y: auto;
          border: 1px solid ${theme.colors.border};
          border-radius: ${theme.borderRadius.sm};
          padding: ${theme.spacing.xs};
        }

        .sync-modal-inline-options {
          display: flex;
          align-items: center;
          gap: ${theme.spacing.md};
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .sync-modal-provider-list,
          .sync-modal-district-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

        }

        @media (max-width: 520px) {
          .sync-modal-provider-list,
          .sync-modal-district-grid {
            grid-template-columns: 1fr;
          }

          .sync-modal-district-toolbar {
            grid-template-columns: 1fr;
          }

          .sync-provider-row {
            min-height: 0;
          }

          .sync-provider-meta {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
      <Modal
        open={open}
        title="Preparar sincronização"
        size="xl"
        onClose={onClose}
        closeOnBackdrop={!loadingDistricts}
        style={{ width: "min(1100px, calc(100vw - 32px))", maxWidth: "min(1100px, calc(100vw - 32px))", padding: theme.spacing.md }}
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
      <div className="sync-modal-content">
      <div className="sync-modal-summary">
        <span>Defina os providers, localização e tipo de anunciante que pretende consultar.</span>
        {!loadingDistricts && !districtsError ? (
          [
            eligibleSelectedProviders.length > 0
              ? eligibleSelectedProviders.map((value) => availableProviders.find((providerItem) => normalizeProviderValue(providerItem.value) === value)?.label || value).join(", ")
              : null,
            selectedDistricts.length > 0 ? selectedDistricts.join(", ") : null,
            (includePrivateOwners && includeProfessionalOwners)
              ? "Particulares e Profissionais"
              : includePrivateOwners
                ? "Particulares"
                : includeProfessionalOwners
                  ? "Profissionais"
                  : null
          ].filter(Boolean).join(" \u203a ") || "Sem filtros seleccionados"
        ) : null}
      </div>

      <section style={sectionStyle} aria-labelledby="sync-provider-label">
        <div className="sync-modal-section-heading">
          <strong id="sync-provider-label">Providers</strong>
          <span style={{ color: theme.colors.muted, fontSize: theme.typography.caption?.fontSize || "0.8rem" }}>
            {eligibleSelectedProviders.length} de {selectableProviderValues.length}
          </span>
        </div>

        <label style={{ ...compactLabelStyle, marginBottom: theme.spacing.xs }}>
          <input
            type="checkbox"
            checked={allSelectedProviders}
            ref={(element) => {
              if (element) element.indeterminate = someSelectedProviders;
            }}
            disabled={selectableProviderValues.length === 0}
            onChange={toggleAllProviders}
          />
          <span>Todos</span>
        </label>

        <div className="sync-modal-provider-list">
          {availableProviders.map((providerItem) => {
            const providerValue = normalizeProviderValue(providerItem.value);
            const status = providerStatuses[providerValue];
            const lastUpdatedLabel = providerValue === "idealista"
              ? "Em breve"
              : (status?.last_execution ? formatShortDateTime(status.last_execution) : "Ainda não atualizado");
            const statusText = getProviderStatusText(status, providerValue);
            const isDisabled = isDisabledProvider(providerItem);
            const isChecked = !isDisabled && effectiveSelectedProviders.includes(providerValue);
            const logoUrl = getProviderLogo(providerItem.value);

            return (
              <label
                key={providerValue}
                className="sync-provider-row"
                title={providerItem.label}
                style={isDisabled ? { opacity: 0.72, borderStyle: "dashed" } : undefined}
              >
                <span className="sync-provider-main">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => toggleProvider(providerItem.value)}
                  />
                  <span className="sync-provider-logo">
                    <img src={logoUrl} alt="" aria-hidden="true" />
                  </span>
                  <span className="sync-provider-name">{providerItem.label}</span>
                </span>
                <span className="sync-provider-meta" style={isDisabled ? { fontWeight: 600 } : undefined}>
                  <span className="sync-provider-status">{statusText}</span>
                  <span className="sync-provider-status">{lastUpdatedLabel}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle} aria-labelledby="sync-districts-label">
        <div className="sync-modal-section-heading">
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
            <div className="sync-modal-district-toolbar">
              <input
                type="search"
                value={districtQuery}
                onChange={(event) => setDistrictQuery(event.target.value)}
                placeholder="Pesquisar distrito..."
                aria-label="Pesquisar distrito"
                style={controlStyle}
              />
              <div className="sync-modal-district-actions">
                <Button size="sm" variant="ghost" onClick={() => setSelectedDistricts(districts)} disabled={allDistrictsSelected}>
                  Seleccionar todos
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedDistricts([])} disabled={selectedDistricts.length === 0}>
                  Limpar selecção
                </Button>
              </div>
            </div>
            <div className="sync-modal-district-grid">
              {visibleDistricts.length > 0 ? visibleDistricts.map((district) => (
                <label key={district} style={{ ...compactLabelStyle, padding: `${theme.spacing.xs} ${theme.spacing.xs}` }}>
                  <input
                    type="checkbox"
                    checked={selectedDistrictSet.has(district)}
                    onChange={() => toggleDistrict(district)}
                  />
                  <span>{district}</span>
                </label>
              )) : (
                <p style={{ gridColumn: "1 / -1", margin: theme.spacing.sm, color: theme.colors.muted }}>Nenhum distrito encontrado.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section style={sectionStyle} aria-labelledby="sync-advertiser-label">
        <strong id="sync-advertiser-label" style={{ display: "block", marginBottom: theme.spacing.xs }}>Tipo de anunciante</strong>
        <div className="sync-modal-inline-options">
          <label style={compactLabelStyle}>
            <input type="checkbox" checked={includePrivateOwners} onChange={(event) => setIncludePrivateOwners(event.target.checked)} />
            Particulares
          </label>
          <label style={compactLabelStyle}>
            <input type="checkbox" checked={includeProfessionalOwners} onChange={(event) => setIncludeProfessionalOwners(event.target.checked)} />
            Profissionais
          </label>
        </div>
      </section>

      <label style={{ ...compactLabelStyle, padding: `${theme.spacing.xs} 0` }}>
        <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} />
        Guardar esta selecção como padrão
      </label>
      </div>
      </Modal>
    </>
  );
}
