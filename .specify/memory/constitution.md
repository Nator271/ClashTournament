<!--
Sync Impact Report
- Version change: uninitialized template -> 1.0.0
- Modified principles: placeholders -> Security; Reliability; Architecture; AI-Readable Code
- Added sections: Technology Stack; Development Workflow
- Removed sections: fifth principle placeholder, because the requested constitution defines four rules
- Follow-up TODOs: confirm the original ratification date
-->

# ClashTournament Constitution

## Core Principles

### I. Security and Secret Isolation
Discord tokens, Clash of Clans API keys, and every other credential MUST be supplied
through environment variables or an equivalent secret manager. Credentials MUST NOT be
committed, hard-coded, logged, or exposed in error responses. Open-source compatibility
is a release gate: secret scanning and configuration review MUST pass before deployment.

### II. API Reliability and Resilience
Every asynchronous interaction with the Clash of Clans API MUST use explicit error
handling with `try/catch` (or an equivalent typed error boundary), enforce rate-limiting,
and use a basic cache where repeated reads are possible. Failures MUST be observable and
must produce a controlled user-facing response rather than an unhandled rejection.
These controls protect the bot from provider limits, transient outages, and duplicate
requests.

### III. Separated Responsibilities
Discord slash commands, Discord event listeners, and tournament business logic MUST be
implemented in separate modules with explicit interfaces between them. Transport adapters
MUST NOT contain tournament rules, and domain services MUST NOT depend directly on Discord
event details. This separation keeps changes local and makes tournament behavior
independently testable.

### IV. AI-Readable, Strongly Typed Code
The project MUST use TypeScript on Node.js with strict type checking enabled. Use of
`any` is prohibited; unknown external data MUST be narrowed or validated before use.
Files MUST remain short and modular, public and non-obvious APIs MUST have JSDoc, and
names MUST describe domain intent. These constraints make the codebase predictable for
human maintainers and future AI-assisted iterations.

## Technology Stack

The runtime stack is Node.js and TypeScript with strict compiler settings. Dependencies
MUST be selected for active maintenance and typed interfaces where practical. External
Discord and Clash of Clans integrations MUST be isolated behind application-owned
adapters so providers can be replaced or tested without changing tournament rules.

## Development Workflow

Every change MUST include focused tests for altered business behavior and regression tests
for repaired defects. Pull requests MUST verify secret handling, strict typing, API error
boundaries, rate-limiting, caching, and module ownership. Changes that cross the Discord,
integration, or tournament boundaries MUST include an integration-level test or a written
reason why one is not feasible. Documentation and JSDoc MUST be updated with public API
changes.

## Governance

This constitution is the highest-level project guidance for design and implementation.
Amendments MUST describe the affected principles, rationale, migration impact, and test
or review implications in the Sync Impact Report. An amendment requires maintainer review
before merge, and every pull request MUST check compliance with the active constitution.

Versions follow Semantic Versioning: MAJOR for backward-incompatible governance changes
or removed principles, MINOR for new principles or materially expanded obligations, and
PATCH for clarifications or non-semantic wording changes. Compliance MUST be reviewed
before release and whenever a change affects security, external APIs, module boundaries,
or type-safety policy.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-09-17
