import {
  Badge,
  Button,
  Card,
  DataTable,
  FilterBar,
  Input,
  KpiCard,
  PageHeader,
  Select
} from "./index";

export default function UIUsageExample() {
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <PageHeader
        eyebrow="Operacao"
        title="Cockpit"
        subtitle="Exemplo de composicao com a fundacao UI"
        breadcrumb={[{ label: "Home", href: "#" }, { label: "Cockpit" }]}
        actions={<Button variant="primary">Nova acao</Button>}
      />

      <FilterBar
        actions={<Button variant="secondary">Aplicar filtros</Button>}
      >
        <Input label="Telefone" placeholder="9xxxxxxxx" />
        <Select label="Estado" options={[{ label: "Ativo", value: "ativo" }, { label: "Pendente", value: "pendente" }]} />
      </FilterBar>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        <KpiCard title="Leads" value="128" trend="+12%" icon="L" />
        <Card>
          <Badge variant="success">Saudavel</Badge>
        </Card>
      </div>

      <DataTable
        columns={[
          { key: "nome", title: "Nome" },
          { key: "estado", title: "Estado" }
        ]}
        rows={[
          { id: 1, nome: "Lead A", estado: "Novo" },
          { id: 2, nome: "Lead B", estado: "Contactado" }
        ]}
      />
    </div>
  );
}
