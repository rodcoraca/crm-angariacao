import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const colunas = ["novo", "contactado", "agendado", "fechado"];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    setLeads(data || []);
  }

  async function mudarStatus(id, novoStatus) {
    const { error } = await supabase
      .from("leads")
      .update({ status: novoStatus })
      .eq("id", id);

  if (error) {
    console.log("ERRO:", error);
    alert(error.message);
}
    carregar();
  }

  function leadsPorStatus(status) {
    return leads.filter(l => l.status === status);
  }

  return (
    <div style={board}>
      {colunas.map(col => (
        <div key={col} style={column}>
          <h3 style={{ textTransform: "capitalize" }}>{col}</h3>

          {leadsPorStatus(col).map(lead => (
            <div key={lead.id} style={card}>
              <strong>{lead.nome}</strong>
              <p>{lead.telefone}</p>

          {lead.observacoes && (
              <div style={obsBox}>
                📝 {lead.observacoes}
              </div>
          )}

              <select
                value={lead.status}
                onChange={(e) => mudarStatus(lead.id, e.target.value)}
                style={select}
              >
                {colunas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const board = {
  display: "flex",
  gap: "20px",
  overflowX: "auto"
};

const column = {
  background: "#f1f5f9",
  padding: "15px",
  borderRadius: "10px",
  minWidth: "250px"
};

const card = {
  background: "white",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
};

const select = {
  width: "100%",
  marginTop: "10px"
};

const obsBox = {
  marginTop: "8px",
  padding: "8px",
  background: "#fef3c7",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#92400e"
};