# OSFlow – Decisão de Arquitetura

## Navegação Segura e Proteção de Alterações Não Guardadas

**Documento:** DEC-NAV-001
**Estado:** Aprovado
**Categoria:** Arquitetura Compartilhada
**Versão:** 1.0

---

# Objetivo

Definir o padrão oficial do OSFlow para proteção contra perda de alterações não guardadas em qualquer formulário da aplicação.

Esta decisão estabelece uma infraestrutura reutilizável e transversal, garantindo uma experiência consistente em todos os módulos do sistema.

---

# 1. Princípios

O OSFlow adota o princípio de que:

> **Nenhuma alteração efetuada por um utilizador poderá ser perdida silenciosamente devido à navegação na aplicação.**

Sempre que existirem alterações pendentes, o sistema deverá solicitar uma decisão explícita ao utilizador antes de abandonar o contexto atual.

---

# 2. Âmbito

Esta decisão aplica-se a todos os formulários editáveis do OSFlow.

Inclui, entre outros:

* Leads
* Imóveis
* Empresas
* Utilizadores
* Fluxo
* Radar
* Documentos
* Configurações
* Módulos futuros

---

# 3. Arquitetura

A funcionalidade deverá ser implementada através de uma infraestrutura reutilizável localizada em:

```text
src/shared/navigation/
```

Componentes principais:

```text
useDirtyForm

NavigationGuard

UnsavedChangesDialog
```

Nenhum módulo deverá implementar lógica própria para deteção de alterações pendentes.

---

# 4. useDirtyForm

Responsável por gerir o estado do formulário.

Disponibiliza, no mínimo:

* estado limpo;
* estado alterado;
* marcação manual de alterações;
* limpeza do estado após gravação;
* reposição do estado inicial.

API de referência:

```javascript
const {
    isDirty,
    markDirty,
    markClean,
    reset
} = useDirtyForm();
```

---

# 5. NavigationGuard

Responsável por impedir a navegação quando existirem alterações pendentes.

Deverá proteger:

* mudança de menu;
* mudança de página;
* abertura de outro registo;
* botão voltar;
* fecho da ficha;
* pesquisa global;
* logout;
* refresh da página;
* fecho do navegador.

A decisão de permitir ou impedir a navegação deverá ser centralizada exclusivamente neste componente.

---

# 6. UnsavedChangesDialog

Sempre que a navegação for bloqueada deverá ser apresentado um diálogo do Design System.

Título:

> Alterações não guardadas

Mensagem:

> Existem alterações por guardar.
>
> Pretende guardar antes de sair?

Ações disponíveis:

* Guardar
* Descartar alterações
* Continuar a editar

É proibida a utilização de:

* window.alert()
* window.confirm()

---

# 7. Fluxo Funcional

```text
Utilizador altera um campo
            │
            ▼
      markDirty()
            │
            ▼
      isDirty = true
            │
            ▼
Tentativa de navegação
            │
            ▼
   NavigationGuard
            │
            ▼
 UnsavedChangesDialog
```

### Guardar

```text
Guardar

↓

Persistir alterações

↓

markClean()

↓

Executar navegação pendente
```

---

### Descartar

```text
Descartar alterações

↓

reset()

↓

Executar navegação pendente
```

---

### Continuar a editar

```text
Continuar a editar

↓

Fechar diálogo

↓

Cancelar navegação
```

---

# 8. Responsabilidades

## Componentes

Devem apenas:

* marcar alterações;
* limpar estado após gravação.

Não deverão implementar lógica de navegação.

---

## NavigationGuard

Responsável por:

* bloquear navegação;
* memorizar a ação pendente;
* executar a ação após decisão do utilizador.

---

## UnsavedChangesDialog

Responsável exclusivamente pela interação com o utilizador.

Não deverá conter regras de negócio.

---

# 9. Reutilização

Todos os módulos deverão reutilizar esta infraestrutura.

É proibido implementar mecanismos alternativos de confirmação de alterações não guardadas.

Qualquer necessidade adicional deverá ser evoluída nesta infraestrutura comum.

---

# 10. Benefícios

Esta decisão garante:

* experiência consistente em toda a aplicação;
* prevenção da perda acidental de dados;
* reutilização de código;
* redução de duplicação;
* manutenção simplificada;
* evolução centralizada da funcionalidade.

---

# 11. Critérios de Aceitação

Uma implementação cumpre esta decisão quando:

* alterações pendentes impedem navegação silenciosa;
* o utilizador pode Guardar, Descartar ou Continuar a editar;
* todos os módulos reutilizam a mesma infraestrutura;
* não existem implementações locais de confirmação;
* a navegação é retomada corretamente após a decisão do utilizador.

---

# Implementação de Referência

Primeira implementação realizada em:

**Módulo:** Leads

Componentes utilizados:

* `useDirtyForm`
* `NavigationGuard`
* `UnsavedChangesDialog`

Esta implementação passa a constituir a referência oficial para futuras integrações em todo o OSFlow.

---

# Decisão Final

Fica aprovado que:

* O OSFlow utilizará uma infraestrutura única para proteção de alterações não guardadas.
* Todos os formulários editáveis deverão integrar o `NavigationGuard`.
* A deteção de alterações será efetuada através do `useDirtyForm`.
* A confirmação ao utilizador será realizada exclusivamente através do `UnsavedChangesDialog`.
* Não serão aceites implementações locais ou alternativas desta funcionalidade.
