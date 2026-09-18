# Implementation Plan: Gestion de tournois Clash of Clans sur Discord

**Branch**: `001-clash-tournament-management` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-clash-tournament-management/spec.md`, avec les choix de projet TypeScript, `discord.js` et SQLite.

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Construire un bot Discord permettant de créer, publier et administrer des tournois Clash of Clans, depuis l'inscription des équipes jusqu'au classement final. La v1 utilise TypeScript strict sur Node.js, `discord.js` v14 pour les interactions Discord, `better-sqlite3` derrière des repositories pour la persistance locale, et des adaptateurs isolés pour Discord et l'API officielle Clash of Clans. Le domaine reste indépendant des types Discord et des détails HTTP.

## Technical Context

**Language/Version**: TypeScript strict sur Node.js 22 LTS (version minimale à fixer dans `package.json` et la CI)

**Primary Dependencies**: `discord.js` v14 déjà présent dans le dépôt; `better-sqlite3`, client HTTP natif Node.js et Vitest à ajouter pendant la phase Setup

**Storage**: SQLite locale via `better-sqlite3`, WAL, foreign keys, migrations SQL numérotées et table d'outbox pour les effets Discord; les dates de début et de fin d'inscription sont stockées en UTC

**Testing**: tests unitaires du domaine, tests d'intégration SQLite sur fichier temporaire, tests d'intégration des ports Discord/Clash avec adaptateurs simulés, tests de secret scanning et de typecheck strict; les scripts et dépendances de test seront ajoutés par la phase Setup

**Target Platform**: serveur Linux x64, un processus Node.js, bot Discord installé sur un ou plusieurs serveurs

**Project Type**: bot Discord événementiel avec services applicatifs et persistence locale

**Performance Goals**: création/publication en moins de 5 minutes d'interaction utilisateur; vérification Clash compréhensible en moins de 10 s quand le service est disponible; bracket et salons pour 32 équipes en moins de 60 s; résultat final en moins de 60 s après le dernier match

**Constraints**: réponse Discord initiale sous 3 s; aucune donnée joueur non vérifiée; limite API Clash configurable (8 req/s, 4 appels concurrents, file de 100); transactions SQLite courtes; secrets uniquement via environnement/gestionnaire de secrets; aucune dépendance Discord dans le domaine

**Scale/Scope**: tournois multi-serveurs, jusqu'à 32 équipes par tournoi dans la cible de performance; élimination directe en v1; un processus et une base SQLite par déploiement. Le format est porté par une règle de progression isolée afin que d'autres formats puissent être ajoutés sans réécrire les flux communs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Security and Secret Isolation**: PASS. Les tokens Discord et Clash seront lus depuis la configuration d'exécution, absents des embeds, logs et événements d'audit; une vérification de configuration et un secret scan sont prévus.
- **II. API Reliability and Resilience**: PASS. L'adaptateur Clash encapsule timeouts, retries bornés, rate limiting, cache, déduplication et erreurs typées; aucun échec externe ne confirme un joueur.
- **III. Separated Responsibilities**: PASS. Les handlers Discord traduisent les interactions en commandes applicatives; le domaine expose des ports et ne dépend ni de `discord.js`, ni de l'API Clash, ni de SQLite.
- **IV. AI-Readable, Strongly Typed Code**: PASS. TypeScript strict, validation des données externes, interdiction de `any`, modules courts et JSDoc sur les ports publics.
- **Development Workflow**: PASS sous réserve des tâches. Les changements de règles auront des tests ciblés; les frontières Discord/Clash/SQLite auront des tests d'intégration ou une justification explicite.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
```text
src/
├── domain/
│   ├── tournament/
│   ├── team/
│   ├── match/
│   ├── result/
│   └── shared/
├── application/
│   ├── ports/
│   └── use-cases/
├── adapters/
│   ├── discord/
│   │   ├── commands/
│   │   ├── components/
│   │   ├── modals/
│   │   └── presenters/
│   └── clash-of-clans/
├── infrastructure/
│   ├── persistence/
│   │   ├── migrations/
│   │   └── repositories/
│   ├── scheduling/
│   └── config/
└── bootstrap/

tests/
├── unit/
├── integration/
└── contract/

migrations/
└── 0001_initial.sql
```

**Structure Decision**: Projet unique TypeScript organisé en couches hexagonales. Les règles déterministes vivent dans `src/domain`, les cas d'usage dans `src/application`, et les dépendances Discord, Clash et SQLite sont des adaptateurs remplaçables. Les tests suivent les frontières de responsabilité; `migrations/` reste versionné et exécuté avant le démarrage des handlers. La création du tournoi utilise deux modales courtes ou une modale suivie d'une étape de confirmation afin de rester dans la limite Discord de cinq champs par modale.

## Constitution Check — Post-Design

- **I. Security and Secret Isolation**: PASS. Les contrats Discord, Clash et le modèle d'audit excluent les secrets; la configuration et le quickstart imposent des variables d'environnement et un contrôle de secret scan.
- **II. API Reliability and Resilience**: PASS. Le contrat Clash formalise cache, rate limiting, timeouts, retries bornés et catégories d'erreur; l'outbox et le scheduler rendent les effets Discord reprenables.
- **III. Separated Responsibilities**: PASS. Les contrats exposent des ports applicatifs et des contrôleurs Discord minces; SQLite reste derrière les repositories et le domaine n'importe aucun adaptateur.
- **IV. AI-Readable, Strongly Typed Code**: PASS. Le modèle définit des états et bornes explicites, tandis que le plan impose TypeScript strict, validation des données externes et modules courts.
- **Development Workflow**: PASS. Le quickstart couvre tests unitaires, intégration SQLite, frontières externes, concurrence, reprise après redémarrage et absence de secrets.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | Aucun écart à la constitution identifié. |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
