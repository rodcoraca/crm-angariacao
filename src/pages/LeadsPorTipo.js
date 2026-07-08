import FichaLead from "../FichaLead";
import { useTheme } from "../theme/ThemeContext";
import { useLeadsPorTipo } from "../modules/leads/hooks";
import { emojiTipoLead, formatarDataLeadCard } from "../modules/leads/viewmodels";
import { notifyError } from "../components/ui/feedbackBus";
import EmptyState from "../components/ui/EmptyState";

export default function LeadsPorTipo({ tipo, user, onAbrirLead }) {
  const theme = useTheme();
  const {
    leads,
    leadSelecionadoId,
    abrirFicha,
    fecharFicha,
    atualizarObsLocal,
    alterarTipo,
    salvarObservacao,
    nomeAgente
  } = useLeadsPorTipo({ tipo, user, onAbrirLead });

  async function handleSalvarObservacao(id, texto) {
    const result = await salvarObservacao(id, texto);
    if (result.error) {
      notifyError(result.error.message);
    }
  }

  if (leadSelecionadoId) {
    return (
      <div>
        <button style={{ ...btnVoltar, background: theme.colors.surfaceSoft, border: `1px solid ${theme.colors.border}`, color: theme.colors.text }} onClick={fecharFicha}>
          ← Voltar para a lista
        </button>
        <FichaLead
          leadId={leadSelecionadoId}
          user={user}
          voltar={fecharFicha}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: theme.colors.primary }}>{emojiTipoLead(tipo)} {tipo.toUpperCase()}</h2>

      <div style={wrapper}>
        <div style={grid}>
          {leads.length === 0 ? (
            <EmptyState
              title="Sem leads nesta categoria"
              description="Ainda não existem registos para o filtro selecionado."
              style={{ gridColumn: "1 / -1" }}
            />
          ) : null}

          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{ ...card(lead.tipo), cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onClick={() => abrirFicha(lead.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  abrirFicha(lead.id);
                }
              }}
            >
              <div style={header}>
                <strong>{lead.nome}</strong>
                <span>{emojiTipoLead(lead.tipo)}</span>
              </div>

              <p style={{ margin: "4px 0" }}>{lead.telefone}</p>

		<p style={{ fontSize: "11px", color: "var(--os-color-muted)" }}>
  		{new Date(lead.updated_at).toLocaleString()}
	      </p>

              <p style={dataStyle}>
                📅 Último contacto: {formatarDataLeadCard(lead.updated_at || lead.created_at)}
              </p>

              <p style={agenteStyle}>
                <strong>Agente:</strong> {nomeAgente(lead.agente_id)}
              </p>

              <textarea
                style={{ ...textarea, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
                value={lead.observacoes || ""}
                onChange={(e) => atualizarObsLocal(lead.id, e.target.value)}
                onBlur={(e) => handleSalvarObservacao(lead.id, e.target.value)}
                onClick={(event) => event.stopPropagation()}
                placeholder="Adicionar observações..."
              />

	      <select
                value={lead.tipo}
                onChange={(e) => alterarTipo(lead.id, e.target.value)}
                onClick={(event) => event.stopPropagation()}
                style={{ ...select, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
              >
                <option value="quente">🔥 Quente</option>
                <option value="morno">🟡 Morno</option>
                <option value="frio">❄️ Frio</option>
              </select>

              <button
                style={{ ...btnFicha, background: theme.colors.primary }}
                onClick={(event) => {
                  event.stopPropagation();
                  abrirFicha(lead.id);
                }}
              >
                Editar ficha
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 🔥 ESTILOS

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px"
};

const card = (tipo) => ({
  background:
    tipo === "quente"
      ? "var(--os-status-success-surface)"
      : tipo === "morno"
      ? "var(--os-status-warning-surface)"
      : "var(--os-status-danger-surface)",
  padding: "15px",      // 👈 mais espaço interno
  borderRadius: "10px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
});

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px"
};

const obsBox = {
  marginTop: "8px",
  padding: "8px",
  background: "var(--os-status-warning-surface)",
  borderRadius: "6px",
  fontSize: "12px",
};

const select = {
  marginTop: "10px",
  width: "100%",
  padding: "8px",
};

const wrapper = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "20px"
};

const textarea = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "10px",
  padding: "8px",
  borderRadius: "6px",
  fontSize: "13px",
  resize: "none",
  overflowY: "auto",
  height: "100px"
};

const btnFicha = {
  marginTop: "10px",
  width: "100%",
  padding: "8px",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600"
};

const btnVoltar = {
  marginBottom: "16px",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600"
};
const btnSalvar = {
  marginTop: "6px",
  width: "100%",
  padding: "6px",
  background: "var(--os-status-info-text)",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
};

const agenteStyle = {
  fontSize: "12px",
  color: "var(--os-color-text)",
  margin: "6px 0"
};

const dataStyle = {
  fontSize: "14px",
  color: "var(--os-color-muted)",
  marginTop: "4px"
};


