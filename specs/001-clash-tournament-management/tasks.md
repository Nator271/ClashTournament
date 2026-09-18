---

description: "Task list for Clash of Clans tournament management"
---

# Tasks: Gestion de tournois Clash of Clans sur Discord

**Input**: Design documents from `/specs/001-clash-tournament-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, constitution.md

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialiser le projet TypeScript strict et les outils communs.

- [X] T001 Create the Node.js 22 TypeScript project scripts and strict compiler configuration in `package.json` and `tsconfig.json`
- [X] T002 [P] Configure ESLint, formatting, and the no-`any` rule in `eslint.config.js` and `.prettierrc.json`
- [X] T003 [P] Add the source, test, migration, and environment-file structure from the plan in `src/`, `tests/`, `migrations/`, `.env.example`, and `.gitignore`
- [X] T004 [P] Configure Vitest and temporary SQLite test execution in `vitest.config.ts` and `tests/setup.ts`
- [X] T005 [P] Add CI typecheck, test, lint, and secret-scan jobs for Node.js 22 in `.github/workflows/ci.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mettre en place les frontières et les primitives qui bloquent toutes les stories.

**Checkpoint**: La fondation est prête lorsque la configuration, l'autorisation, SQLite, l'audit/outbox et les ports applicatifs sont utilisables sans dépendance Discord dans le domaine.

- [X] T006 Create validated runtime configuration for `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `CLASH_API_TOKEN`, and `DATABASE_PATH` without logging secrets in `src/infrastructure/config/env.ts`
- [X] T007 [P] Define shared branded identifiers, clock, domain errors, and validation helpers in `src/domain/shared/`
- [X] T008 [P] Define application ports for Discord effects, authorization, persistence, scheduling, and audit/outbox in `src/application/ports/`
- [X] T009 Create SQLite connection setup with WAL, foreign keys, busy timeout, short transactions, and migration runner in `src/infrastructure/persistence/database.ts` and `src/infrastructure/persistence/migrator.ts`
- [X] T010 Create migration `migrations/0001_initial.sql` for ServerConfiguration, Tournament, TeamApplication, TeamManager, VerifiedPlayer, Round, Match, ResultSubmission, StaffDecision, AuditEvent, OutboxEvent, and Draft, including the extensible `format` discriminator with `SINGLE_ELIMINATION` as the v1 value, `registrationStartsAt`, `registrationEndsAt`, single-elimination round state, foreign keys, and required uniqueness constraints
- [X] T011 [P] Implement strict repositories for configuration, tournaments, applications, matches, results, decisions, audit events, outbox events, and drafts in `src/infrastructure/persistence/repositories/`
- [X] T012 [P] Implement append-only audit and idempotent outbox services with secret-safe payload validation in `src/application/services/audit-service.ts` and `src/application/services/outbox-service.ts`
- [X] T013 [P] Implement server role/permission authorization and guild scoping in `src/application/services/authorization-service.ts`
- [X] T014 Implement the persistent deadline scheduler and restart recovery in `src/infrastructure/scheduling/deadline-scheduler.ts`
- [X] T015 [P] Implement centralized typed error mapping and secret-safe structured logging in `src/infrastructure/observability/`
- [X] T016 [P] Define domain aggregates and state-transition policies shared by all stories in `src/domain/tournament/`, `src/domain/team/`, `src/domain/match/`, and `src/domain/result/`
- [X] T017 Implement Discord client bootstrap, interaction routing, versioned `customId` parsing, and the under-three-second defer/reply path in `src/bootstrap/discord.ts` and `src/adapters/discord/interaction-router.ts`
- [X] T018 Implement application bootstrap ordering for configuration, migrations, scheduler recovery, outbox worker, and Discord handlers in `src/bootstrap/main.ts`

---

## Phase 3: User Story 1 - Créer et publier un tournoi (Priority: P1) MVP

**Goal**: Permettre à un organisateur autorisé de créer un brouillon, confirmer ses règles et publier un message d'inscription.

**Independent Test**: Dans un serveur de test, exécuter `/tournament create`, compléter les deux modales avec 1 à 10 joueurs, les dates d'inscription, la durée de round, le message facultatif et le format élimination directe, confirmer le récapitulatif puis vérifier le message public et le bouton d'inscription.

### Tests for User Story 1

- [X] T019 [P] [US1] Add domain tests for Tournament creation, status transitions, validation of `playersPerTeam` 1..10, and single-elimination format extensibility boundary in `tests/unit/domain/tournament.spec.ts`
- [X] T020 [P] [US1] Add application tests for organizer/admin authorization, draft cancellation, confirmation, and publish outbox idempotency in `tests/unit/application/tournament-publish.spec.ts`
- [X] T021 [P] [US1] Add Discord interaction tests for the creation modal, rules recap, publish button, and deferReply timing in `tests/contract/discord-tournament-create.spec.ts`

### Implementation for User Story 1

- [X] T022 [P] [US1] Implement Tournament value objects, a format strategy interface/registry with `SINGLE_ELIMINATION` as the only enabled v1 strategy, the scheduled `DRAFT -> REGISTRATION_OPEN` transition at `registrationStartsAt`, and strict format validation in `src/domain/tournament/tournament.ts` and `src/domain/tournament/format-strategy.ts`
- [X] T023 [P] [US1] Implement draft creation and expiration with registration start/end date validation, optimistic version checks, and no automatic publication in `src/application/use-cases/create-tournament-draft.ts` and `src/infrastructure/persistence/repositories/draft-repository.ts`
- [X] T024 [US1] Implement create, confirm, and publish tournament use cases with role checks, recap generation, and audit/outbox events in `src/application/use-cases/create-tournament.ts` and `src/application/use-cases/publish-tournament.ts`
- [X] T025 [US1] Implement `/tournament create`, `/tournament publish`, and `/tournament status` handlers plus the two-step creation modals for team size, registration start/end dates, round duration, fixed single-elimination format, and optional organizer message, with versioned custom IDs, in `src/adapters/discord/commands/tournament-commands.ts` and `src/adapters/discord/modals/tournament-creation-modal.ts`
- [X] T026 [US1] Implement the public rules embed, registration button, and safe error presenters in `src/adapters/discord/presenters/tournament-presenter.ts`
- [X] T027 [US1] Add the tournament registration message and publication effects to the Discord outbox worker in `src/adapters/discord/outbox-worker.ts`

**Checkpoint**: US1 fonctionne seule; un tournoi publié est visible, correctement récapitulé et prêt à recevoir des candidatures.

---

## Phase 4: User Story 2 - Déposer et modérer une inscription d'équipe (Priority: P1)

**Goal**: Construire les candidatures persistantes, vérifier chaque joueur Clash et permettre les décisions staff traçables avant la clôture.

**Independent Test**: Depuis le bouton d'inscription, créer une candidature par étapes avec des tags simulés valides, vérifier pseudo/niveau, soumettre la taille exacte, puis accepter, refuser ou demander correction depuis l'interface staff.

### Tests for User Story 2

- [X] T028 [P] [US2] Add TeamApplication and VerifiedPlayer domain tests for exact `playersPerTeam`, at least one manager, statuses, edit cutoff, and unique `(tournament_id, normalized_tag)` in `tests/unit/domain/team-application.spec.ts`
- [X] T029 [P] [US2] Add Clash gateway adapter tests for normalization, positive/404 caches, 8 requests/sec, 4 concurrent calls, queue size 100, 8-second timeout, two bounded retries, and secret-safe errors in `tests/contract/clash-gateway.spec.ts`
- [X] T030 [P] [US2] Add SQLite integration tests for concurrent duplicate tags, foreign keys, accepted-application immutability after closure, and append-only staff decisions in `tests/integration/team-registration.sqlite.spec.ts`
- [X] T031 [P] [US2] Add Discord interaction tests for multi-step drafts, invalid/unavailable tags, staff-only actions, and correction messages in `tests/contract/discord-team-registration.spec.ts`

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement TeamApplication, TeamManager, VerifiedPlayer entities and validation: non-empty name, managers in guild, valid tag, informational town hall snapshot, and no unverified player confirmation in `src/domain/team/`
- [X] T033 [US2] Define the `ClashOfClansGateway` port and typed `Verified`, `InvalidTag`, `NotFound`, `RateLimited`, `TemporarilyUnavailable`, and `ConfigurationError` results in `src/application/ports/clash-of-clans-gateway.ts`
- [X] T034 [US2] Implement the Clash HTTP adapter for `GET /v1/players/{urlEncodedTag}` with 10-minute positive cache, 30-second 404 cache, 8 req/s, 4 concurrency, queue 100, 8-second timeout, and at most two transient retries in `src/adapters/clash-of-clans/http-clash-gateway.ts`
- [X] T035 [US2] Implement create/edit/submit team application use cases with re-verification, duplicate-tag protection, closure checks, and audit events in `src/application/use-cases/team-application/`
- [X] T036 [US2] Implement staff accept, reject, request-correction, and disqualify use cases with mandatory reason and actor checks in `src/application/use-cases/staff/application-decision.ts`
- [X] T037 [US2] Implement `/team apply`, `/team edit`, `/staff application`, and versioned add-player modal/button handlers in `src/adapters/discord/commands/team-commands.ts`, `src/adapters/discord/commands/staff-application-commands.ts`, and `src/adapters/discord/components/team-components.ts`
- [X] T038 [US2] Implement application presenters and status notifications that expose verified tag, name, town hall, actionable errors, and no secrets in `src/adapters/discord/presenters/team-presenter.ts`

**Checkpoint**: US2 fonctionne seule sur un tournoi publié; seules les candidatures complètes et les joueurs vérifiés peuvent être soumis ou acceptés.

---

## Phase 5: User Story 3 - Organiser les rounds et les horaires de match (Priority: P1)

**Goal**: Clôturer les inscriptions, générer un bracket aléatoire avec byes explicites, créer les espaces privés et coordonner les horaires et rounds.

**Independent Test**: Avec des équipes acceptées en nombre pair puis impair, clôturer un tournoi, vérifier le bracket enregistré, le bye sans faux match, les private threads et la confirmation d'un horaire.

### Tests for User Story 3

- [X] T039 [P] [US3] Add bracket tests for random first-round pairing, accepted teams only, explicit bye handling, no fake match, and deterministic elimination progression in `tests/unit/domain/bracket.spec.ts`
- [X] T040 [P] [US3] Add round progression tests requiring every match `RESOLVED` or staff-decided before the next round in `tests/unit/domain/round-progression.spec.ts`
- [X] T041 [P] [US3] Add SQLite/outbox integration tests for atomic closure, idempotent match-space creation, scheduler restart recovery, failed Discord permissions, and single-elimination round persistence in `tests/integration/bracket-scheduling.sqlite.spec.ts`
- [X] T042 [P] [US3] Add Discord contract tests for private thread participants, deadline display, schedule proposal/confirmation, and staff fallback access in `tests/contract/discord-match-scheduling.spec.ts`

### Implementation for User Story 3

- [X] T043 [P] [US3] Implement Round, Match, bye, deadline, and schedule domain rules with statuses and constraints in `src/domain/match/round.ts` and `src/domain/match/match.ts`
- [X] T044 [US3] Implement deterministic single-elimination bracket generation behind an injectable random source, atomic registration closure, and first-round creation in `src/application/use-cases/close-registration.ts` and `src/application/services/bracket-generator.ts`
- [X] T045 [US3] Implement schedule proposal/confirmation and elimination next-round generation only after resolved matches or staff decisions in `src/application/use-cases/match-scheduling/` and `src/application/use-cases/advance-round.ts`
- [X] T046 [US3] Implement `/tournament close` and `/match schedule` handlers with permission checks and versioned component IDs in `src/adapters/discord/commands/tournament-close-command.ts` and `src/adapters/discord/commands/match-schedule-command.ts`
- [X] T047 [US3] Implement private-thread creation, manager/staff access, bye notifications, deadline notices, and permission-failure fallback through `src/adapters/discord/match-space-adapter.ts` and `src/adapters/discord/match-notifications.ts`

**Checkpoint**: US3 produit un round opérationnel et ne fait jamais progresser un bracket incomplet ou contradictoire.

---

## Phase 6: User Story 4 - Saisir, vérifier et départager un résultat (Priority: P1)

**Goal**: Collecter progressivement les statistiques, appliquer le départage conditionnel et laisser le staff résoudre les contestations avec historique.

**Independent Test**: Sur un match, soumettre étoiles, puis uniquement les critères nécessaires en cas d'égalité; vérifier le vainqueur, le blocage des soumissions contradictoires et une correction staff motivée.

### Tests for User Story 4

- [X] T048 [P] [US4] Add result-domain tests for stars `0..3 x players`, destruction `0..100`, attack time `0..3`, conditional collection, and high/high/low comparison order in `tests/unit/domain/result-resolution.spec.ts`
- [X] T049 [P] [US4] Add result integration tests for one-sided submissions, contradictory submissions, persistent ties, blocked bracket progression, and staff assignment in `tests/integration/result-resolution.sqlite.spec.ts`
- [X] T050 [P] [US4] Add Discord contract tests for progressive result modals, validation errors, staff-only resolution, and audit references in `tests/contract/discord-match-results.spec.ts`

### Implementation for User Story 4

- [X] T051 [P] [US4] Implement ResultSubmission value objects, conditional-stat requirements, and winner comparison rules in `src/domain/result/result-submission.ts` and `src/domain/result/tiebreaker.ts`
- [X] T052 [US4] Implement result submission, validation, contest blocking, and progression-gate use cases in `src/application/use-cases/match-results/`
- [X] T053 [US4] Implement staff validate, correct, cancel, and assign-result use cases with mandatory reason and append-only StaffDecision records in `src/application/use-cases/staff/result-decision.ts`
- [X] T054 [US4] Implement `/match result` and `/staff result` handlers with progressive modals, manager scope checks, and under-three-second acknowledgement in `src/adapters/discord/commands/match-result-command.ts` and `src/adapters/discord/commands/staff-result-command.ts`
- [X] T055 [US4] Implement result presenters, contest notices, deadline escalation, and safe audit-reference messages in `src/adapters/discord/presenters/result-presenter.ts`

**Checkpoint**: US4 détermine automatiquement les résultats non ambigus et bloque toute progression nécessitant une décision staff.

---

## Phase 7: User Story 5 - Annoncer la fin du tournoi (Priority: P2)

**Goal**: Terminer automatiquement le tournoi et publier un récapitulatif consultable du vainqueur, classement et résultats.

**Independent Test**: Résoudre le dernier match, vérifier `COMPLETED`, puis vérifier sous 60 secondes le message final et le récapitulatif accessible sans nouvelle inscription.

### Tests for User Story 5

- [ ] T056 [P] [US5] Add completion and ranking tests for final-round resolution, `IN_PROGRESS -> COMPLETED`, available standings, and archived read-only behavior in `tests/unit/application/tournament-completion.spec.ts`
- [ ] T057 [P] [US5] Add outbox integration tests for idempotent final publication, restart recovery, and completion notification timing in `tests/integration/tournament-completion.sqlite.spec.ts`
- [ ] T058 [P] [US5] Add Discord contract tests for final winner, ranking, round summary, and status-query presentation in `tests/contract/discord-tournament-summary.spec.ts`

### Implementation for User Story 5

- [ ] T059 [US5] Implement final single-elimination ranking, completion transition, and read-only tournament summary use cases in `src/application/use-cases/complete-tournament.ts` and `src/application/use-cases/get-tournament-summary.ts`
- [ ] T060 [US5] Implement final message rendering with winner, available ranking, round results, and public status in `src/adapters/discord/presenters/final-tournament-presenter.ts`
- [ ] T061 [US5] Wire last-match resolution to completion and idempotent final announcement through `src/application/services/tournament-lifecycle.ts` and `src/adapters/discord/outbox-worker.ts`

**Checkpoint**: US5 conclut le tournoi sans autoriser de nouvelles inscriptions ou modifications et conserve l'historique consultable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble du produit, les performances et la conformité de sécurité.

- [ ] T062 [P] Add end-to-end quickstart coverage for two-step creation, dated registration, team verification, single-elimination bracket, schedule, results, contest, and final announcement in `tests/e2e/quickstart.spec.ts`
- [ ] T063 [P] Add resilience tests for Clash 404, 429, timeout, 5xx, bounded retries, and no unverified player persistence in `tests/integration/clash-resilience.spec.ts`
- [ ] T064 [P] Add secret scanning assertions over logs, embeds, audit payloads, fixtures, and repository history in `tests/security/secret-handling.spec.ts`
- [ ] T065 [P] Add performance checks for under-three-second interaction acknowledgement, under-60-second 32-team bracket/thread creation, and under-60-second final publication in `tests/performance/tournament-latency.spec.ts`
- [ ] T066 [P] Document environment setup, Discord permissions, migration behavior, and operational recovery in `README.md` and `specs/001-clash-tournament-management/quickstart.md`
- [ ] T067 Run `npm run typecheck`, `npm test`, `npm run lint`, the JSDoc validation for public and non-obvious APIs, and the documented quickstart from `README.md`; record any remaining gaps in `specs/001-clash-tournament-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002-T005 can run in parallel after T001 establishes package scripts.
- **Foundational (Phase 2)**: Depends on Setup; T007-T008, T011-T013, and T015-T016 can run in parallel after the project structure exists; T009-T010 precede repository implementation; T017-T018 consume the ports and configuration.
- **User Stories (Phases 3-7)**: Depend on Phase 2. US1 is the MVP. US2 depends on the published tournament contract from US1; US3 depends on accepted applications from US2; US4 depends on matches from US3; US5 depends on resolved results from US4.
- **Polish (Phase 8)**: Depends on the desired stories being complete; T062-T065 can run in parallel with each other after the relevant stories exist.

### User Story Dependencies

- **US1 (P1)**: After Foundational; no story dependency and is the suggested MVP.
- **US2 (P1)**: After Foundational and the published registration message from US1; independently testable with a fixture tournament.
- **US3 (P1)**: After Foundational and accepted applications from US2; independently testable with seeded accepted teams.
- **US4 (P1)**: After Foundational and active matches from US3; independently testable with a seeded match.
- **US5 (P2)**: After Foundational and resolved final results from US4; independently testable with a seeded final match.

### Parallel Opportunities

- Setup: T002, T003, T004, and T005 are parallel once T001 establishes the package scripts.
- Foundational: domain primitives, ports, repositories, observability, authorization, and shared aggregates can be split by files after migrations/interfaces are agreed.
- US1: T019-T021 are parallel tests; T022-T023 can be parallel; presenters and handlers can proceed after use-case contracts are fixed.
- US2: T028-T031 are parallel tests; domain entities, gateway port, and adapter are separate files; handlers and presenters can proceed after use-case contracts.
- US3: T039-T042 are parallel tests; bracket rules and match rules are separate domain files.
- US4: T048-T050 are parallel tests; tiebreaker logic and result submission entities are separate modules.
- US5: T056-T058 are parallel tests; final ranking and presentation are separate modules.
- Across stories: after Foundation, teams can prepare story-specific tests and seeded fixtures in parallel, but integration follows the dependency chain US1 -> US2 -> US3 -> US4 -> US5.

## Parallel Example: User Story 1

```text
Task: T019 Domain validation tests in tests/unit/domain/tournament.spec.ts
Task: T020 Publish use-case tests in tests/unit/application/tournament-publish.spec.ts
Task: T021 Discord interaction tests in tests/contract/discord-tournament-create.spec.ts
Task: T022 Tournament domain in src/domain/tournament/tournament.ts
Task: T023 Draft use case in src/application/use-cases/create-tournament-draft.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1, including its focused tests and publication outbox.
3. Validate creation, recap, publication, permissions, and safe errors independently.
4. Demonstrate the published registration message before adding team registration.

### Incremental Delivery

1. Add US2 to turn the published message into verified, moderated applications.
2. Add US3 to close registration and operate rounds, byes, spaces, and schedules.
3. Add US4 to resolve results and contested matches.
4. Add US5 to publish final standings and make completed tournaments read-only.
5. Run Phase 8 checks before release, including secret scan, strict typecheck, resilience, and quickstart validation.

### Traceability

Each story maps to its acceptance scenarios and requirements: US1 covers FR-001..FR-005 and FR-024..FR-025; US2 covers FR-006..FR-012 and FR-026..FR-027; US3 covers FR-013..FR-015 and FR-021..FR-022; US4 covers FR-016..FR-020 and FR-022, FR-027; US5 covers FR-023, FR-027 and the completion scenarios.