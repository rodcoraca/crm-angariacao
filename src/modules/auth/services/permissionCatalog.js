export const STANDARD_ACTIONS = ["view", "create", "edit", "delete"];

const MODULE_GROUPS = [
  {
    key: "crm",
    label: "CRM",
    groups: [
      {
        key: "operacao",
        label: "Operação CRM",
        base: "crm",
        extras: ["export", "import"]
      },
      {
        key: "leads_quentes",
        label: "Leads Quentes",
        base: "leads.hot"
      },
      {
        key: "leads_mornos",
        label: "Leads Mornos",
        base: "leads.warm"
      },
      {
        key: "leads_frios",
        label: "Leads Frios",
        base: "leads.cold"
      },
      {
        key: "mensagens",
        label: "Mensagens",
        base: "messages"
      }
    ]
  },
  {
    key: "dashboard",
    label: "Dashboard",
    groups: [
      {
        key: "indicadores",
        label: "Indicadores",
        base: "dashboard",
        extras: ["manage"]
      }
    ]
  },
  {
    key: "imoveis",
    label: "Imóveis",
    groups: [
      {
        key: "estoque",
        label: "Estoque",
        base: "inventory"
      }
    ]
  },
  {
    key: "radar",
    label: "Radar",
    groups: [
      {
        key: "prospeccao",
        label: "Prospecção",
        base: "radar"
      }
    ]
  },
  {
    key: "administracao",
    label: "Administração",
    groups: [
      {
        key: "utilizadores",
        label: "Gestão de Utilizadores",
        base: "users"
      },
      {
        key: "logs",
        label: "Logs",
        base: "logs"
      },
      {
        key: "configuracoes",
        label: "Configurações",
        base: "settings",
        extras: ["manage"]
      },
      {
        key: "documentacao_arquitetura",
        label: "Documentação Arquitetura",
        base: "docs.architecture"
      },
      {
        key: "documentacao_banco_dados",
        label: "Documentação Banco de Dados",
        base: "docs.database"
      },
      {
        key: "documentacao_roadmap",
        label: "Documentação Roadmap",
        base: "docs.roadmap"
      },
      {
        key: "documentacao_saas",
        label: "Documentação SaaS",
        base: "docs.saas"
      },
      {
        key: "documentacao_seguranca",
        label: "Documentação Segurança",
        base: "docs.security"
      },
      {
        key: "documentacao_changelog",
        label: "Documentação Changelog",
        base: "docs.changelog"
      }
    ]
  }
];

function buildStandardPermissions(base) {
  return STANDARD_ACTIONS.map((action) => ({
    code: `${base}.${action}`,
    action,
    label: action
  }));
}

export const PERMISSION_MODULES = MODULE_GROUPS.map((moduleItem) => ({
  key: moduleItem.key,
  label: moduleItem.label,
  groups: moduleItem.groups.map((groupItem) => {
    const standardPermissions = buildStandardPermissions(groupItem.base);
    const extraPermissions = (groupItem.extras || []).map((extraAction) => ({
      code: `${groupItem.base}.${extraAction}`,
      action: extraAction,
      label: extraAction
    }));

    return {
      key: groupItem.key,
      label: groupItem.label,
      permissions: [...standardPermissions, ...extraPermissions]
    };
  })
}));

export function getAllPermissionDefinitions() {
  return PERMISSION_MODULES.flatMap((moduleItem) =>
    moduleItem.groups.flatMap((groupItem) =>
      groupItem.permissions.map((permission) => ({
        code: permission.code,
        label: `${moduleItem.label} > ${groupItem.label} > ${permission.label}`,
        module: moduleItem.key,
        group: groupItem.key,
        action: permission.action
      }))
    )
  );
}
