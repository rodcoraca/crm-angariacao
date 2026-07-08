import React from "react";

export default function ListaDocumentos({ ficheiros, onSelect, onDownload, onDelete }) {
  return (
    <div>
      {ficheiros.filter(f => f.tipo === "pdf").map(f => (
        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottom: "1px solid var(--os-color-border)" }}>
          <div style={{ cursor: "pointer" }} onClick={() => onSelect(f)}>{f.nome}</div>
          <div>
            <button style={{ marginRight: 6 }} onClick={() => onDownload(f)}>⬇</button>
            <button onClick={() => onDelete(f)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

