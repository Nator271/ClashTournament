# Guide de validation

## Prérequis

- Node.js 22 LTS et npm.
- Une application Discord avec token de bot, client ID et secret Clash of Clans fournis par variables d'environnement; ne jamais les committer.
- Un serveur Discord de test avec un rôle organisateur et un rôle staff.
- Une base SQLite locale sur disque Linux.

Variables minimales attendues: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `CLASH_API_TOKEN`, `DATABASE_PATH`. Les noms exacts seront centralisés par la configuration lors de l'implémentation.

## Installation et vérifications

```bash
npm ci
npm run typecheck
npm test
npm run lint
```

Résultat attendu: TypeScript strict sans erreur, tests unitaires et d'intégration verts, lint sans violation, aucune dépendance ou fixture ne contient de secret.

## Scénario de bout en bout

1. Démarrer le bot et appliquer automatiquement les migrations SQLite.
2. Dans un serveur de test, exécuter `/tournament create`, compléter les deux étapes de création avec 1 à 10 joueurs par équipe, les dates de début et de fin des inscriptions, la durée d'un round et éventuellement un message organisateur; le format est l'élimination directe en v1.
3. Confirmer le récapitulatif puis publier le tournoi; vérifier le message public et le bouton d'inscription.
4. Créer une candidature en plusieurs étapes, ajouter des tags valides et vérifier que le pseudo et l'hôtel de ville proviennent de l'adaptateur Clash.
5. Soumettre une candidature incomplète et un tag invalide; vérifier qu'aucun joueur non vérifié n'est enregistré et que le niveau d'hôtel de ville affiché reste informatif.
6. Faire accepter la candidature par le staff, puis vérifier l'événement d'audit et l'interdiction de modifier après clôture.
7. Clôturer avec un nombre pair puis impair d'équipes; vérifier le tirage enregistré, le bye sans faux match et la création des private threads.
8. Proposer puis confirmer un horaire dans un thread de match.
9. Soumettre des résultats avec égalité d'étoiles, puis vérifier la demande conditionnelle du pourcentage et du temps; vérifier que le plus petit temps gagne en dernier départage.
10. Soumettre des résultats contradictoires et vérifier le blocage jusqu'à une décision staff motivée.
11. Résoudre le dernier match et vérifier le statut `COMPLETED`, le message final et le classement consultable.

## Tests de résilience

- Simuler une réponse Clash 404, 429, timeout et 5xx; vérifier retries bornés, message compréhensible et absence de confirmation.
- Rejouer deux soumissions concurrentes avec le même tag; vérifier la contrainte unique et l'absence de double inscription.
- Arrêter puis redémarrer le bot avec une outbox et une échéance en attente; vérifier que le scheduler reprend sans doublon.
- Retirer les permissions de création de thread; vérifier l'alerte staff et l'accès de secours au résultat.
- Scanner les logs, messages et événements d'audit; vérifier l'absence des tokens et clés.

Les entités et contraintes de persistance sont détaillées dans [data-model.md](data-model.md); les interfaces Discord et Clash sont définies dans [contracts/discord-interactions.md](contracts/discord-interactions.md) et [contracts/clash-of-clans.md](contracts/clash-of-clans.md).
