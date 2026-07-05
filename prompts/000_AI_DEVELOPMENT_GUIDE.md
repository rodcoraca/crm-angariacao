# OSFlow – AI Development Guide

> Este documento estabelece as diretrizes obrigatórias para qualquer implementação realizada na plataforma OSFlow. Todo desenvolvimento deverá seguir estas regras antes de criar, modificar ou remover qualquer código.

---

# 1. Objetivo

A OSFlow é uma plataforma SaaS empresarial, modular, escalável e multiempresa.

O objetivo deste documento é garantir continuidade do desenvolvimento, preservar a arquitetura existente e evitar retrabalho.

---

# 2. Regra Fundamental

Sempre desenvolver sobre a estrutura existente.

Nunca assumir que o projeto começa do zero.

Toda implementação deverá integrar-se ao código já desenvolvido.

---

# 3. Preservação da Arquitetura

Nunca:

- reorganizar pastas
- trocar tecnologias
- alterar padrões de projeto
- renomear arquivos existentes
- substituir bibliotecas sem necessidade
- refatorar módulos sem autorização
- alterar layouts já aprovados

Modificar apenas o necessário para atender ao objetivo solicitado.

---

# 4. Continuidade

Antes de criar qualquer código:

- analisar a arquitetura existente;
- identificar componentes reutilizáveis;
- identificar hooks existentes;
- identificar serviços existentes;
- identificar migrations existentes;
- identificar tabelas existentes.

Sempre reutilizar antes de criar.

Evitar duplicação.

---

# 5. Segurança

Toda funcionalidade deverá nascer preparada para:

- autenticação;
- autorização;
- permissões;
- auditoria;
- multiempresa.

Nunca implementar funcionalidades sem considerar esses requisitos.

---

# 6. Multiempresa

Toda informação pertence a uma empresa.

Sempre considerar:

- company_id;
- isolamento de dados;
- validação da empresa ativa.

Nenhuma consulta poderá retornar informações de outra empresa.

---

# 7. Permissões

Antes de criar qualquer módulo definir suas permissões.

Exemplo:

```
crm.view
crm.create
crm.edit
crm.delete

agenda.view
agenda.create
agenda.edit

finance.view
finance.edit

settings.manage
```

Nenhuma página deverá existir sem previsão de controlo de acesso.

---

# 8. Auditoria

Sempre preparar infraestrutura para registrar:

- login;
- logout;
- criação;
- edição;
- eliminação;
- alterações importantes;
- acessos negados.

---

# 9. Banco de Dados

Sempre utilizar migrations.

Sempre preservar integridade referencial.

Sempre criar índices quando necessários.

Nunca alterar tabelas existentes sem necessidade.

---

# 10. Interface

Preservar:

- identidade visual;
- componentes existentes;
- UX;
- responsividade;
- padrões gráficos aprovados.

Não realizar redesign sem autorização.

---

# 11. Performance

Priorizar:

- reutilização;
- consultas otimizadas;
- componentes leves;
- baixo acoplamento.

Evitar soluções desnecessariamente complexas.

---

# 12. Documentação

Sempre que houver decisão arquitetural relevante:

Atualizar os documentos existentes em:

```
/docs
```

Não criar documentação paralela.

---

# 13. Compatibilidade

Nenhuma implementação poderá quebrar funcionalidades existentes.

Caso exista impacto:

- identificar;
- explicar;
- solicitar autorização.

---

# 14. Filosofia

A prioridade da OSFlow é ser uma plataforma empresarial sólida.

Toda decisão deverá privilegiar:

- estabilidade;
- segurança;
- escalabilidade;
- simplicidade;
- reutilização;
- integração entre módulos.

---

# 15. Fluxo Obrigatório

Toda implementação deverá seguir esta sequência:

1. Analisar arquitetura existente.
2. Identificar reutilização.
3. Definir regras de negócio.
4. Definir permissões.
5. Atualizar banco e migrations.
6. Implementar backend.
7. Implementar frontend.
8. Integrar permissões.
9. Preparar auditoria.
10. Atualizar documentação.
11. Validar regressões.

---

# 16. Regra Máxima

A prioridade absoluta é preservar a continuidade do desenvolvimento.

Não criar soluções paralelas.

Não reinventar funcionalidades.

Não alterar arquitetura sem autorização explícita.

Em caso de dúvida entre criar algo novo ou reutilizar algo existente, priorizar a reutilização desde que não comprometa a qualidade técnica.