import React from "react";

export default function ChecklistDocumentos({ cmi, setCmi, cadernetaPredial, setCadernetaPredial, plantas, setPlantas, certificadoEnergetico, setCertificadoEnergetico, cartaoCidadao, setCartaoCidadao, estacionamento, setEstacionamento }) {
  const labelStyle = { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 15 }}>
      <label style={labelStyle}><input type="checkbox" checked={cmi} onChange={(e) => setCmi(e.target.checked)} /> CMI</label>
      <label style={labelStyle}><input type="checkbox" checked={cadernetaPredial} onChange={(e) => setCadernetaPredial(e.target.checked)} /> Caderneta Predial</label>
      <label style={labelStyle}><input type="checkbox" checked={plantas} onChange={(e) => setPlantas(e.target.checked)} /> Plantas</label>
      <label style={labelStyle}><input type="checkbox" checked={certificadoEnergetico} onChange={(e) => setCertificadoEnergetico(e.target.checked)} /> Certificado Energético</label>
      <label style={labelStyle}><input type="checkbox" checked={cartaoCidadao} onChange={(e) => setCartaoCidadao(e.target.checked)} /> Cartão de Cidadão</label>
    </div>
  );
}
