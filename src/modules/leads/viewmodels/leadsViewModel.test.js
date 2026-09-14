import { filtrarLeadsDashboard } from "./leadsViewModel";

describe("filtrarLeadsDashboard", () => {
  const leads = [
    {
      id: "1",
      nome: "Ana Costa",
      telefone: "+351 912 345 678",
      tipo: "quente",
      origem: "site",
      agente_id: "user-a"
    },
    {
      id: "2",
      nome: "Bruno Silva",
      telefone: "+351 923 456 789",
      tipo: "morno",
      origem: "indicacao",
      agente_id: "user-b"
    },
    {
      id: "3",
      nome: "Carla Dias",
      telefone: "+351 934 567 890",
      tipo: "frio",
      origem: "placa",
      agente_id: "user-a"
    }
  ];

  it("filtra por nome e por telefone", () => {
    expect(filtrarLeadsDashboard(leads, "ana", "", "")).toHaveLength(1);
    expect(filtrarLeadsDashboard(leads, "923456789", "", "")).toHaveLength(1);
    expect(filtrarLeadsDashboard(leads, "nome inexistente", "", "")).toHaveLength(0);
  });

  it("filtra apenas pelo utilizador atribuído à lead", () => {
    expect(filtrarLeadsDashboard(leads, "", "", "user-b")).toHaveLength(1);
    expect(filtrarLeadsDashboard(leads, "", "quente", "user-a")).toHaveLength(1);
  });
});
