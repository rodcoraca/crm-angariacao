import React from "react";

export default function GaleriaFotos({ ficheiros, onDownload, onDelete }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 15, marginTop: 15 }}>
      {ficheiros.filter(f => f.tipo === "imagem").map(f => (
        <div key={f.id} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <img src={f.url} alt={f.nome} style={{ width: 150, height: 100, objectFit: "cover", borderRadius: 10, cursor: "pointer", border: "1px solid #e2e8f0" }} onClick={() => window.open(f.url, "_blank")} />
            <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 6 }}>
              <button style={{ width: 30, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.95)" }} onClick={() => onDownload(f)}>⬇</button>
              <button style={{ width: 30, height: 30, borderRadius: 15, background: "rgba(239,68,68,0.95)", color: "white" }} onClick={() => onDelete(f)}>🗑</button>
            </div>
          </div>
          <div style={{ marginTop: 8, textAlign: "center", fontSize: 13, color: "#475569", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</div>
        </div>
      ))}
    </div>
  );
}
