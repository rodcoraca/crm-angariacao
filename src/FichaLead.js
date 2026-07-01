import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { normalizarTelefone, validarTelefone, telefonesCoincidem } from "./telefone";
import { useTheme } from "./theme/ThemeContext";
import Button from "./components/Button";
import Input from "./Input";
import Card from "./components/Card";

export default function FichaLead({ leadId, user, voltar }) {
  const theme = useTheme();
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [telefoneErro, setTelefoneErro] = useState("");

  const styles = {
    container: {
      position: "relative",
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.lg,
      minHeight: "580px"
    },
    backButton: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      zIndex: 10,
      minWidth: "46px",
      borderRadius: "8px",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: theme.spacing.lg,
      alignItems: "flex-start",
      marginBottom: theme.spacing.lg
    },
    headerTitle: {
      margin: 0,
      fontSize: "1.8rem",
      lineHeight: 1.05,
      color: theme.colors.text
    },
    headerSubtitle: {
      margin: 0,
      color: theme.colors.muted,
      fontSize: "0.95rem"
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 16px",
      borderRadius: theme.borderRadius.lg,
      fontWeight: 700,
      fontSize: "0.95rem"
    },
    infoBox: {
      background: theme.colors.surfaceSoft,
      color: theme.colors.text,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
      fontSize: "0.95rem"
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg
    },
    label: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.xs,
      fontSize: "0.95rem",
      color: theme.colors.muted
    },
    select: {
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing.sm,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      outline: "none"
    },
    textarea: {
      minHeight: "140px",
      marginTop: theme.spacing.xs
    },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg
    },
    btnSecondary: {
      minWidth: "150px"
    },
    btnPrimary: {
      minWidth: "170px"
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: "13px",
      marginTop: theme.spacing.xs
    },
    loading: {
      minHeight: "280px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: theme.colors.muted,
      fontSize: "1rem"
    }
  };

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

  function handleTelefoneChange(valor) {
    const telefoneNormalizado = normalizarTelefone(valor);
    setForm((prev) => ({ ...prev, telefone: telefoneNormalizado }));

    if (!telefoneNormalizado) {
      setTelefoneErro("");
      return;
    }

    setTelefoneErro(
      validarTelefone(telefoneNormalizado)
        ? ""
        : "Informe o telefone com 12 dígitos (indicativo + 9 dígitos)."
    );
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

    const telefoneNormalizado = normalizarTelefone(form.telefone);

    if (!validarTelefone(telefoneNormalizado)) {
      setSalvando(false);
      alert("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).");
      return;
    }

    const { data: leadsDuplicadas, error: erroDuplicado } = await supabase
      .from("leads")
      .select("id, telefone")
      .neq("id", leadId)
      .order("created_at", { ascending: false });

    if (erroDuplicado) {
      setSalvando(false);
      alert(erroDuplicado.message);
      return;
    }

    const leadDuplicado = leadsDuplicadas?.find((lead) => telefonesCoincidem(telefoneNormalizado, lead.telefone));

    if (leadDuplicado) {
      setSalvando(false);
      alert("Já existe uma lead cadastrada com este telefone.");
      return;
    }

    const { error } = await supabase
      .from("leads")
      .update({
        nome: form.nome,
        telefone: telefoneNormalizado,
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
    voltar?.();
  }

  if (loading) return <Card style={styles.loading}>A carregar ficha...</Card>;
  if (!lead || !form) return <Card style={styles.loading}>Lead não encontrada.</Card>;

  const badgeType = {
    quente: { background: "#dcfce7", color: "#166534" },
    morno: { background: "#fef9c3", color: "#92400e" },
    frio: { background: "#fee2e2", color: "#991b1b" }
  }[form.tipo] || { background: theme.colors.surfaceSoft, color: theme.colors.text };

  return (
    <Card style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.headerTitle}>Ficha da Lead</h2>
          <p style={styles.headerSubtitle}>Criada em {formatarData(lead.created_at)}</p>
        </div>

        <span style={{ ...styles.badge, ...badgeType }}>{labelTipo(form.tipo)}</span>
      </div>

      <div style={styles.infoBox}>
        <strong>Criada por:</strong> {nomeAgente(lead.agente_id)}
      </div>

      <div style={styles.grid}>
        <label style={styles.label}>
          Telefone
          <Input
            value={form.telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            maxLength={12}
            inputMode="numeric"
          />
          {telefoneErro && <div style={styles.errorText}>{telefoneErro}</div>}
        </label>

        <label style={styles.label}>
          Nome
          <Input value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} />
        </label>

        <label style={styles.label}>
          Tipo
          <select style={styles.select} value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>
        </label>

        <label style={styles.label}>
          Origem
          <select style={styles.select} value={form.origem} onChange={(e) => atualizar("origem", e.target.value)}>
            <option value="">Sem origem</option>
            <option value="placa">Placa na rua</option>
            <option value="indicacao">Indicação</option>
            <option value="site">Site de imóveis</option>
          </select>
        </label>

        <label style={styles.label}>
          Status
          <select style={styles.select} value={form.status} onChange={(e) => atualizar("status", e.target.value)}>
            <option value="novo">Novo</option>
            <option value="contactado">Contactado</option>
            <option value="agendado">Agendado</option>
            <option value="fechado">Fechado</option>
          </select>
        </label>

        <label style={styles.label}>
          Agente responsável
          <select style={styles.select} value={form.agente_id} onChange={(e) => atualizar("agente_id", e.target.value)}>
            <option value="">Sem agente</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.email ? `${agente.nome} - ${agente.email}` : agente.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={styles.label}>
        Observações
        <Input as="textarea" style={styles.textarea} value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value)} />
      </label>

      <div style={styles.footer}>
        <Button color="light" style={styles.btnSecondary} onClick={voltar}>Cancelar</Button>
        <Button color="success" style={styles.btnPrimary} onClick={salvar} disabled={salvando}>
          {salvando ? "A guardar..." : "Guardar alterações"}
        </Button>
      </div>
    </Card>
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
