# OSFlow Agent Rules

## Mandatory Implementation Sequence for New Modules

For every new module created by AI in this repository, follow this exact sequence:

1. Create tables.
2. Create migration.
3. Create permissions.
4. Create validations.
5. Create APIs.
6. Create interface.
7. Register audit.

## Enforcement Rules

- Do not skip steps.
- Do not change existing modules unless explicitly requested.
- Keep backward compatibility with existing flows.
- Use existing project structure and coding patterns.
- Document the migration and traceability in /docs before closing the task.

## Scope

These rules apply to future AI-driven implementations only.
