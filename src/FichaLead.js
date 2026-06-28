import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function FichaLead({ leadId, user, voltar }) {
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarFicha();
  }, [leadId]);

  async function carregarFicha() {
    setLoading(true);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLead(data);
    setForm({
      nome: data.nome || "",
      telefone: data.telefone || "",
      tipo: data.tipo || "morno",
      origem: data.origem || "",
      observacoes: data.observacoes || "",
      status: data.status || "novo",
      agente_id: data.agente_id || ""
    });

    await carregarAgentes(data.agente_id);
    setLoading(false);
  }

  async function carregarAgentes(agenteAtualId) {
    const { data, error } = await supabase
      .from("agentes")
      .select("id,nome,email,ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!error && data?.length) {
      setAgentes(data.map((a) => ({
        id: a.id,
        nome: a.nome || a.email || a.id,
        email: a.email || ""
      })));
      return;
    }

    const { data: leadsData } = await supabase
      .from("leads")
      .select("agente_id")
      .not("agente_id", "is", null);

    const ids = [...new Set((leadsData || []).map((l) => l.agente_id).filter(Boolean))];
    if (agenteAtualId && !ids.includes(agenteAtualId)) ids.push(agenteAtualId);
    if (user?.id && !ids.includes(user.id)) ids.push(user.id);

    setAgentes(ids.map((id) => ({
      id,
      nome: id === user?.id ? nomeUtilizadorAtual() : "Agente validado",
      email: id === user?.id ? user?.email || "" : id
    })));
  }

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function nomeUtilizadorAtual() {
    return user?.user_metadata?.nome ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "Agente atual";
  }

  function nomeAgente(id) {
    const agente = agentes.find((a) => a.id === id);
    if (agente) return agente.email ? `${agente.nome} (${agente.email})` : agente.nome;
    if (id === user?.id) return nomeUtilizadorAtual();
    return id || "Sem agente";
  }

  async function salvar() {
    setSalvando(true);

    const { error } = await supabase
      .from("leads")
      .update({
        nome: form.nome,
        telefone: form.telefone,
        tipo: form.tipo,
        origem: form.origem,
        observacoes: form.observacoes,
        status: form.status,
        agente_id: form.agente_id || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", leadId);

    setSalvando(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Ficha da lead atualizada!");
    carregarFicha();
  }

  if (loading) return <div style={box}>A carregar ficha...</div>;
  if (!lead || !form) return <div style={box}>Lead não encontrada.</div>;

  return (
    <div style={box}>
      <button style={btnVoltarTop} onClick={voltar}>
        ↩️
      </button>

      <div style={header}>
        <div>
          <h2 style={titulo}>Ficha da Lead</h2>
          <p style={subtitulo}>Criada em {formatarData(lead.created_at)}</p>
        </div>

        <span style={badge(form.tipo)}>{labelTipo(form.tipo)}</span>
      </div>

      <div style={infoBox}>
        <strong>Criada por:</strong> {nomeAgente(lead.agente_id)}
      </div>

      <div style={grid}>
        <label style={label}>
          Nome
          <input style={input} value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} />
        </label>

        <label style={label}>
          Telefone
          <input style={input} value={form.telefone} onChange={(e) => atualizar("telefone", e.target.value)} />
        </label>

        <label style={label}>
          Tipo
          <select style={input} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>
        </label>

        <label style={label}>
          Origem
          <select style={input} value={form.origem} onChange={(e) => atualizar("origem", e.target.value)}>
            <option value="">Sem origem</option>
            <option value="placa">Placa na rua</option>
            <option value="indicacao">Indicação</option>
            <option value="site">Site de imóveis</option>
          </select>
        </label>

        <label style={label}>
          Status
          <select style={input} value={form.status} onChange={(e) => atualizar("status", e.target.value)}>
            <option value="novo">Novo</option>
            <option value="contactado">Contactado</option>
            <option value="agendado">Agendado</option>
            <option value="fechado">Fechado</option>
          </select>
        </label>

        <label style={label}>
          Agente responsável
          <select style={input} value={form.agente_id} onChange={(e) => atualizar("agente_id", e.target.value)}>
            <option value="">Sem agente</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.email ? `${agente.nome} - ${agente.email}` : agente.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={label}>
        Observações
        <textarea
          style={textarea}
          value={form.observacoes}
          onChange={(e) => atualizar("observacoes", e.target.value)}
        />
      </label>

      <div style={footer}>
        <button style={btnSecundario} onClick={voltar}>Cancelar</button>
        <button style={btnPrincipal} onClick={salvar} disabled={salvando}>
          {salvando ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </div>
  );
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleString("pt-PT");
}

function labelTipo(tipo) {
  if (tipo === "quente") return "Quente";
  if (tipo === "morno") return "Morno";
  return "Frio";
}

const box = {
  position: "relative",
  background: "white",
  padding: "60px 25px 25px 25px",
  borderRadius: "10px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
};

const btnVoltarTop = {
  position: "absolute",
  top: "15px",
  left: "15px",
  zIndex: 10,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "6px",
  fontSize: "18px",
  cursor: "pointer"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px"
};

const titulo = {
  margin: "0 0 6px 0",
  color: "#0f172a"
};

const subtitulo = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px"
};

const infoBox = {
  background: "#f1f5f9",
  color: "#334155",
  padding: "10px 12px",
  borderRadius: "8px",
  marginBottom: "18px",
  fontSize: "14px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
  marginBottom: "14px"
};

const label = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "600"
};

const input = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing: "border-box",
  width: "100%"
};

const textarea = {
  ...input,
  minHeight: "130px",
  resize: "vertical",
  lineHeight: "1.5"
};

const footer = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "18px"
};

const btnPrincipal = {
  padding: "12px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "600"
};

const btnSecundario = {
  padding: "12px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: "600"
};

const badge = (tipo) => ({
  padding: "6px 10px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: "700",
  background: tipo === "quente" ? "#dcfce7" : tipo === "morno" ? "#fef9c3" : "#fee2e2",
  color: tipo === "quente" ? "#166534" : tipo === "morno" ? "#92400e" : "#991b1b"
});
