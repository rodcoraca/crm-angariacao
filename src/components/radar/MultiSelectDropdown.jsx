import { useEffect, useRef, useState } from "react";

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  allLabel = "Todos",
  controlStyle,
  theme
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const selectedLabels = options.filter((option) => selected.includes(option.value)).map((option) => option.label);
  const summary = selectedLabels.length === 0 ? allLabel : selectedLabels.join(", ");

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const rowStyle = { display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", cursor: "pointer", color: theme?.colors?.text };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={`Filtro de ${label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={summary}
        onClick={() => setOpen((current) => !current)}
        style={{
          ...controlStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          textAlign: "left",
          cursor: "pointer",
          background: theme?.colors?.surface || "#fff",
          color: theme?.colors?.text,
          fontWeight: selectedLabels.length > 0 ? 600 : 400
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            minWidth: "100%",
            maxHeight: 260,
            overflowY: "auto",
            marginTop: 2,
            padding: "4px 0",
            background: theme?.colors?.surface || "#fff",
            border: `1px solid ${theme?.colors?.border || "#d1d5db"}`,
            borderRadius: theme?.borderRadius?.sm,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <label style={rowStyle}>
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
            <span>{allLabel}</span>
          </label>
          {options.map((option) => (
            <label key={option.value} style={rowStyle}>
              <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
              <span style={{ whiteSpace: "nowrap" }}>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
