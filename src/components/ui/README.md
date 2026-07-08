# OSFlow UI Foundation

Biblioteca base unica para os componentes de interface da OSFlow.

## Objetivo

- Padronizar componentes reutilizaveis.
- Garantir variantes, estados e props consistentes.
- Dar base para migracao gradual dos modulos sem alterar regras de negocio.

## Componentes obrigatorios

- Button
- Card
- Input
- Select
- Badge
- Modal
- Tooltip
- Breadcrumb
- EmptyState
- Skeleton
- PageHeader
- FilterBar
- KpiCard
- DataTable
- Toast

## Regras de uso

- Importar preferencialmente de src/components/ui/index.js.
- Evitar novos estilos hardcoded em componentes de negocio.
- Preferir variantes e props dos componentes antes de criar novas excecoes locais.
- Nao criar duplicatas em src/components ou src raiz para componentes basicos.

## API resumida

### Button
Props principais: variant, size, fullWidth, loading, disabled, leftIcon, rightIcon.
Variantes: primary, secondary, danger, ghost, light.

### Card
Props principais: variant, padding, interactive, children.
Variantes: surface, soft, elevated.

### Input
Props principais: label, hint, error, size, as, fullWidth.
Estados: default, focus, error, disabled.

### Select
Props principais: label, options, placeholder, hint, error, size.
Estados: default, error, disabled.

### Badge
Props principais: variant, size, outlined.
Variantes: neutral, primary, success, warning, danger.

### Modal
Props principais: open, title, children, footer, size, closeOnBackdrop.
Estados: aberto/fechado.

### Tooltip
Props principais: content, placement, disabled, delay.
Variantes de posicionamento: top, right, bottom, left.

### Breadcrumb
Props principais: items, separator.
Estado ativo: ultimo item com aria-current.

### EmptyState
Props principais: title, description, action, icon.
Variantes: default, compact.

### Skeleton
Props principais: width, height, lines, animated.

### PageHeader
Props principais: title, subtitle, breadcrumb, actions, eyebrow, compact.

### FilterBar
Props principais: children, actions, sticky, compact.

### KpiCard
Props principais: title/titulo, value/valor, icon/icone, tone/cor, trend/variacao.

### DataTable
Props principais: columns, rows, sortable, striped, compact, onRowClick.

### Toast
Props principais: message, variant, onClose.
Variantes: neutral, success, warning, danger.

## Compatibilidade retroativa

- Table permanece como alias para DataTable com adaptador de props legadas.
- Loading permanece disponivel para uso atual e pode ser substituido por Skeleton progressivamente.
- src/components/Button.jsx, src/components/Card.jsx e src/Input.jsx devem funcionar como reexports para a biblioteca ui.
