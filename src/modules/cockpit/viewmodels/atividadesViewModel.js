export function createAtividadesViewModel() {
  return [
    { id: "atividade-login", title: "Login", description: "Acesso ao Cockpit Executivo registado.", badge: "Agora", variant: "primary", meta: "Placeholder" },
    { id: "atividade-atualizacao", title: "Atualizacao", description: "Registo atualizado no fluxo comercial.", badge: "Ha 12 min", variant: "success", meta: "Placeholder" },
    { id: "atividade-nova-lead", title: "Nova Lead", description: "Nova oportunidade adicionada ao pipeline.", badge: "Ha 18 min", variant: "warning", meta: "Placeholder" },
    { id: "atividade-novo-imovel", title: "Novo Imovel", description: "Imovel inserido para validacao documental.", badge: "Ha 29 min", variant: "neutral", meta: "Placeholder" },
    { id: "atividade-upload-documento", title: "Upload Documento", description: "Documento enviado para revisao interna.", badge: "Ha 41 min", variant: "danger", meta: "Placeholder" }
  ];
}
