import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { askConfirmation, notifyError, notifySuccess } from "../components/ui/feedbackBus";
import { useAuthContext } from "../modules/auth/context";
import {
  associarUtilizadorEmpresa,
  criarEmpresa,
  editarEmpresa,
  listarEmpresasDashboard
} from "../modules/empresas/services";

const defaultForm = {
  nome: "",
  slug: "",
  estado: "ativo"
};

export default function EmpresasAdmin() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const [dashboard, setDashboard] = useState({
    empresas: [],
    utilizadoresAssociados: [],
    utilizadoresOrfaos: [],
    indicadoresTotais: {
      empresas: 0,
      utilizadores: 0,
      leads: 0,
      oportunidades: 0
    }
  });
  const [form, setForm] = useState(defaultForm);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");

  const empresas = dashboard.empresas;
  const usuariosSemEmpresa = dashboard.utilizadoresOrfaos;
  const utilizadoresAssociados = dashboard.utilizadoresAssociados;

  const utilizadoresAssociadosFiltrados = useMemo(() => {
    if (filtroEmpresa === "todas") return utilizadoresAssociados;
    return utilizadoresAssociados.filter((item) => String(item.empresa_id) === String(filtroEmpresa));
  }, [filtroEmpresa, utilizadoresAssociados]);

  const kpis = useMemo(() => ([
    {
      id: "kpi_empresas",
      title: "Empresas",
      value: String(dashboard.indicadoresTotais.empresas || 0),
      icon: "E",
      trend: "Registadas",
      tone: theme.colors.primary
    },
    {
      id: "kpi_utilizadores",
      title: "Utilizadores associados",
      value: String(dashboard.indicadoresTotais.utilizadores || 0),
      icon: "U",
      trend: "Automaticamente",
      tone: theme.colors.success
    },
    {
      id: "kpi_leads",
      title: "Leads",
      value: String(dashboard.indicadoresTotais.leads || 0),
      icon: "L",
      trend: "Por empresa",
      tone: theme.colors.warning
    },
    {
      id: "kpi_oportunidades",
      title: "Oportunidades",
      value: String(dashboard.indicadoresTotais.oportunidades || 0),
      icon: "O",
      trend: "Provider leads",
      tone: theme.colors.text
    }
  ]), [dashboard.indicadoresTotais, theme.colors]);

  const empresasColumns = useMemo(() => ([
    { key: "nome", title: "Empresa" },
    { key: "slug", title: "Slug" },
    { key: "estado", title: "Estado" },
    { key: "utilizadores", title: "Utilizadores" },
    { key: "leads", title: "Leads" },
    { key: "oportunidades", title: "Oportunidades" },
    {
      key: "acoes",
      title: "Ações",
      sortable: false,
      render: (row) => (
        <Button type="button" onClick={() => handleSelectEmpresa(row)}>
          Editar
        </Button>
      )
    }
  ]), []);

  const associadosColumns = useMemo(() => ([
    { key: "empresa_nome", title: "Empresa" },
    {
      key: "nome",
      title: "Utilizador",
      render: (row) => `${row.nome || "Sem nome"} ${row.apelido || ""}`.trim() || "Sem nome"
    },
    { key: "email", title: "Email" },
    {
      key: "updated_at",
      title: "Atualizado em",
      render: (row) => row.updated_at ? new Date(row.updated_at).toLocaleString("pt-PT") : "-"
    }
  ]), []);

  async function carregarDados() {
    setLoading(true);

    const { data, error } = await listarEmpresasDashboard({ currentUser: user });
    if (error) {
      notifyError(error.message || "Falha ao carregar dados de empresas.");
      setDashboard({
        empresas: [],
        utilizadoresAssociados: [],
        utilizadoresOrfaos: [],
        indicadoresTotais: {
          empresas: 0,
          utilizadores: 0,
          leads: 0,
          oportunidades: 0
        }
      });
    } else {
      setDashboard(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateOrUpdate(event) {
    event.preventDefault();

    const action = selectedEmpresaId
      ? editarEmpresa({ empresaId: selectedEmpresaId, form, currentUser: user })
      : criarEmpresa({ form, currentUser: user });

    const result = await action;
    if (result.error) {
      notifyError(result.error.message || "Não foi possível guardar empresa.");
      return;
    }

    setForm(defaultForm);
    setSelectedEmpresaId("");
    notifySuccess(selectedEmpresaId ? "Empresa atualizada." : "Empresa criada.");
    await carregarDados();
  }

  function handleSelectEmpresa(empresa) {
    setSelectedEmpresaId(empresa?.id || "");
    setForm({
      nome: empresa?.nome || "",
      slug: empresa?.slug || "",
      estado: empresa?.estado || "ativo"
    });
  }

  async function handleAssociarUtilizador() {
    const confirmed = await askConfirmation({
      title: "Associar utilizador",
      message: "Confirmar associação manual deste utilizador órfão à empresa selecionada?",
      confirmLabel: "Associar",
      cancelLabel: "Cancelar"
    });

    if (!confirmed) return;

    const result = await associarUtilizadorEmpresa({
      usuarioId: selectedUsuarioId,
      empresaId: selectedEmpresaId,
      currentUser: user
    });

    if (result.error) {
      notifyError(result.error.message || "Falha ao associar utilizador.");
      return;
    }

    notifySuccess("Utilizador associado à empresa com sucesso.");
    setSelectedUsuarioId("");
    await carregarDados();
  }

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      <div style={{ display: "grid", gap: theme.spacing.xs }}>
        <h2 style={{ margin: 0 }}>Administração de Empresas (Beta)</h2>
        <p style={{ margin: 0, color: theme.colors.textLight }}>
          Associação automática por usuarios.empresa_id e gestão mínima para migrações de órfãos.
        </p>
      </div>

      <div style={{ display: "grid", gap: theme.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {kpis.map((item) => (
          <KpiCard
            key={item.id}
            title={item.title}
            value={item.value}
            icon={item.icon}
            trend={item.trend}
            tone={item.tone}
          />
        ))}
      </div>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Empresas</h3>
        <Table
          columns={empresasColumns}
          rows={empresas}
          emptyMessage="Sem empresas disponíveis"
          striped
        />
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>{selectedEmpresaId ? "Editar empresa" : "Nova empresa"}</h3>
        <form onSubmit={handleCreateOrUpdate} style={{ display: "grid", gap: theme.spacing.sm, maxWidth: 560 }}>
          <Input
            label="Nome"
            value={form.nome}
            onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
            placeholder="Nome da empresa"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug"
          />
          <Select
            label="Estado"
            value={form.estado}
            onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" }
            ]}
          />
          <div style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            <Button type="submit" disabled={loading}>
              {selectedEmpresaId ? "Atualizar empresa" : "Criar empresa"}
            </Button>
            {selectedEmpresaId ? (
              <Button
                type="button"
                onClick={() => {
                  setSelectedEmpresaId("");
                  setForm(defaultForm);
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: theme.spacing.sm }}>Utilizadores associados automaticamente</h3>
          <Select
            value={filtroEmpresa}
            onChange={(event) => setFiltroEmpresa(event.target.value)}
            options={[
              { value: "todas", label: "Todas as empresas" },
              ...empresas.map((empresa) => ({ value: empresa.id, label: empresa.nome }))
            ]}
            style={{ minWidth: 220 }}
          />
        </div>
        <Table
          columns={associadosColumns}
          rows={utilizadoresAssociadosFiltrados}
          emptyMessage="Sem utilizadores associados"
          striped
        />
      </Card>

      <Card style={{ padding: theme.spacing.md, border: `1px solid ${theme.colors.border}` }}>
        <h3 style={{ marginTop: 0 }}>Migração e utilizadores órfãos</h3>
        <p style={{ marginTop: 0, color: theme.colors.textLight }}>
          O botão de associação manual permanece apenas para utilizadores sem empresa_id ou ajustes administrativos.
        </p>
        <div style={{ display: "grid", gap: theme.spacing.sm, maxWidth: 560 }}>
          <Select
            label="Utilizador órfão"
            value={selectedUsuarioId}
            onChange={(event) => setSelectedUsuarioId(event.target.value)}
            placeholder="Selecionar utilizador"
            options={usuariosSemEmpresa.map((usuario) => ({
              value: usuario.id,
              label: `${usuario.nome || "Sem nome"} ${usuario.apelido || ""} (${usuario.email || "sem email"})`
            }))}
          />

          <Select
            label="Empresa destino"
            value={selectedEmpresaId}
            onChange={(event) => setSelectedEmpresaId(event.target.value)}
            placeholder="Selecionar empresa"
            options={empresas.map((empresa) => ({ value: empresa.id, label: empresa.nome }))}
          />

          <Button
            type="button"
            onClick={handleAssociarUtilizador}
            disabled={!selectedUsuarioId || !selectedEmpresaId}
          >
            Associar Utilizador
          </Button>
        </div>
      </Card>
    </div>
  );
}
