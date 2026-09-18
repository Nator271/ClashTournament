# Recherche et décisions

## Stack TypeScript et Discord

- **Decision**: TypeScript strict sur Node.js 22 LTS avec `discord.js` v14, organise en couches `domain`, `application`, `adapters` et `infrastructure`.
- **Rationale**: Les handlers Discord restent minces et traduisent les interactions en commandes applicatives; les règles de bracket, d'autorisation métier et de départage restent testables sans Discord.
- **Alternatives considered**: Mettre toute la logique dans `interactionCreate` a été écarté car cela mélange transport, permissions, persistence et règles métier.

Les slash commands sont regroupées par sous-commandes (`/tournament`, `/team`, `/match`, `/staff`). Les permissions Discord sont une première barrière, mais chaque use case revérifie le serveur, l'utilisateur, le rôle et l'état métier. Les commandes guild sont utilisées en développement; les commandes globales en production.

Les modales Discord sont limitées à cinq champs texte. La création du tournoi est donc un parcours en deux étapes: une première modale collecte les informations principales, puis une seconde modale collecte les dates d'inscription et la durée du round; un récapitulatif doit être confirmé avant publication. La création d'équipe est un parcours persistant: brouillon, ajout de joueurs par tag, vérification, puis confirmation. Les `customId` sont versionnés, courts et non sensibles; ils ne constituent jamais une preuve d'autorisation.

Les interactions lentes sont acquittées immédiatement (`deferReply` avant un appel Clash); les tâches de clôture, bracket et échéances passent par un scheduler persistant plutôt que par un simple `setTimeout`. Les matchs utilisent par défaut des private threads; un salon privé dédié est le fallback si les permissions du serveur l'imposent.

## SQLite

- **Decision**: `better-sqlite3` derrière des repositories TypeScript stricts, migrations SQL numérotées et contraintes SQLite.
- **Rationale**: Le volume v1 est faible, les transactions synchrones sont simples à borner et la concurrence d'écriture SQLite reste explicite. WAL, `foreign_keys`, `busy_timeout` et transactions courtes couvrent le besoin d'un processus Node.
- **Alternatives considered**: `sqlite`/`sqlite3` a été écarté pour sa couche asynchrone supplémentaire et son driver sqlite3 archivé. Drizzle ORM reste une évolution possible, mais n'est pas nécessaire à la première implémentation.

Les transactions couvrent les transitions atomiques (acceptation, clôture, génération de round, résultat et disqualification), sans appel réseau ouvert. Une outbox permet de publier ensuite les effets Discord de façon rejouable. L'unicité de `(tournament_id, normalized_tag)` est garantie par la base, pas seulement par une lecture préalable.

## Intégration Clash of Clans

- **Decision**: port `ClashOfClansGateway` et adaptateur HTTP vers `GET /v1/players/{tag}`, avec normalisation locale, cache mémoire, rate limiting et erreurs métier typées.
- **Rationale**: Le domaine conserve un snapshot vérifié du tag, pseudo et niveau d'hôtel de ville; une panne externe ne peut jamais créer un joueur confirmé.
- **Alternatives considered**: Appels HTTP directs dans les handlers et revalidation à chaque affichage ont été écartés car ils compliquent les tests et consomment inutilement le quota.

Paramètres v1: 8 requêtes/seconde, 4 appels simultanés, file bornée à 100, cache positif 10 minutes, cache 404 de 30 secondes, timeout total 8 secondes, deux retries maximum sur erreurs transitoires, et déduplication des requêtes simultanées par tag. Le token vient de l'environnement et n'est jamais journalisé.

## Scheduling et effets externes

- **Decision**: scheduler applicatif persistant fondé sur les échéances en base et une outbox pour les notifications/salons/messages Discord.
- **Rationale**: Un redémarrage ne doit pas perdre la clôture d'inscription, une échéance de round ou la publication du résultat final.
- **Alternatives considered**: `setTimeout` seul a été écarté car il perd les événements au redémarrage et ne fournit pas d'idempotence.

## Points de validation

Les tests prioritaires couvrent les transitions du domaine, la règle de bye, le départage conditionnel, les contraintes SQLite, la concurrence sur un tag, les réponses Discord sous trois secondes, les permissions, les erreurs Clash et l'absence de secrets dans les logs et messages.

## Formats de tournoi

- **Decision**: L'élimination directe est le seul format activé en v1. Elle utilise un bracket avec byes explicites et une stratégie de progression dédiée.
- **Rationale**: Le format est stocké comme un discriminant et ses règles de progression sont isolées des données d'inscription, de match, de résultat et d'audit. Cette séparation permet d'ajouter d'autres formats sans modifier les flux communs.
- **Alternatives considered**: Mélanger les règles de progression dans les commandes et les entités communes a été écarté, car cela rendrait l'ajout d'un format futur risqué et imposerait des changements transversaux.
