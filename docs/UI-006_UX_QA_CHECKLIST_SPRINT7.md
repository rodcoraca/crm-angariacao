# UX QA CHECKLIST - SPRINT 7

## Objetivo
Consolidar checklist de validação UX da aplicação OSFlow, com foco em aderência ao padrão definido antes da criação do OSFLOW_DESIGN_SYSTEM.

## Última revisão
2026-07-08

## Versão do documento
1.0.0

## Responsável
Engenharia da Plataforma OSFlow

## Identificador do documento
UI-006

## Documentos Relacionados
- [INDEX.md](./INDEX.md)
- [OSFLOW_ARCHITECTURE.md](./OSFLOW_ARCHITECTURE.md)
- [UI-007_UX_QA_REPORT_SPRINT7.md](./UI-007_UX_QA_REPORT_SPRINT7.md)

## Índice
- 1. Escopo
- 2. Checklist Executivo
- 3. Evidências Rápidas
- 4. Critérios de Aprovação
- Histórico de Revisões
- Próximas Revisões

## Conteúdo

## 1. Escopo

Checklist aplicado sobre a camada frontend em `src`, incluindo páginas, componentes UI Foundation, componentes de inteligência, módulos legados ainda ativos e folhas CSS globais.

## 2. Checklist Executivo

| Item | Status | Resultado | Observações |
| --- | --- | --- | --- |
| Tipografia padronizada por tokens | Parcial | Falhou em áreas específicas | Existem pesos fortes (700/800) e tamanhos diretos fora da camada tokens em partes da Landing e componentes locais. |
| Cores centralizadas em tema/tokens | Parcial | Quase conforme | Não há hex fora de `src/index.css` e `src/theme/colors.js`, porém há `rgba`, `white` e sombras hardcoded em módulos operacionais e legados. |
| Radius padronizado | Parcial | Falhou em hotspots | Há valores diretos (8, 10, 12, 15, 18, 20, 22, 999) em CSS e JSX sem alias do tema. |
| Padding/spacing padronizado | Parcial | Falhou em hotspots | Há uso intensivo de valores fixos em px em páginas e módulos ainda não migrados para tokens semânticos. |
| Hover consistente em elementos interativos | Parcial | Bom no núcleo, irregular na borda | Regra global existe, mas parte da UI ainda depende de botões/elementos custom sem padronização total da foundation. |
| Focus visível e acessível | Parcial | Bom no núcleo, gap em casos específicos | Existem elementos clicáveis em `div` e `img` sem semântica de teclado/focus dedicada. |
| Cursor coerente (pointer/default/not-allowed) | Parcial | Majoritariamente conforme | Regra global aplicada, com exceções em componentes antigos que gerem cursor manualmente. |
| Responsividade | Parcial | Boa em Landing/Home; limitada no restante | Breakpoints concentrados em poucas folhas CSS, várias páginas operacionais sem regras explícitas. |
| Performance visual (render e estabilidade visual) | Parcial | Melhorando, ainda com dívida | Ainda há muitos `style={{ ... }}` em runtime e composição inline em áreas não migradas. |
| Consistência geral visual | Parcial | Fundação pronta, adoção incompleta | UI Foundation está estabelecida, mas convivendo com padrões antigos e estilos locais heterogêneos. |

## 3. Evidências Rápidas

- `@media` encontrados em poucos arquivos: `src/index.css`, `src/pages/Home.css`, `src/pages/LandingPage.css`, `src/components/intelligence/ActionCard.css`.
- Sem hex hardcoded fora de `src/index.css` e `src/theme/colors.js` (validação automática).
- Hotspots de inline style: `src/components/intelligence/ActionCenter.jsx`, `src/components/intelligence/ActivityFeed.jsx`, `src/components/intelligence/Blockers.jsx`, `src/pages/LandingPage.jsx`, `src/pages/Home.jsx`.
- Casos clicáveis não semânticos: `src/GaleriaFotos.jsx` (`img` com `onClick`) e `src/ListaDocumentos.jsx` (`div` com `onClick`).

## 4. Critérios de Aprovação

A sprint de QA UX é considerada aprovada quando:

- todos os itens da checklist estiverem em estado "Conforme";
- não existirem interações clicáveis não semânticas fora da foundation;
- tokens semânticos forem a fonte dominante de tipografia, cor, radius e spacing;
- responsividade crítica estiver garantida para páginas operacionais principais.

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
| --- | --- | --- | --- |
| 1.0.0 | 2026-07-08 | Engenharia da Plataforma OSFlow | Criação da checklist oficial de UX QA da Sprint 7. |

## Próximas Revisões

- Converter critérios de checklist em validações automáticas de lint/style.
- Definir score mínimo de aderência UX por módulo.
- Integrar checklist ao processo de release.