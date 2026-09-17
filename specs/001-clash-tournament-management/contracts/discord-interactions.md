# Contrat d'interactions Discord

## Commandes

Les commandes sont des contrôleurs minces. Chaque action vérifie le `guildId`, l'identité et l'autorisation métier après la vérification native Discord.

| Commande | Autorisation | Effet |
|---|---|---|
| `/tournament create` | organisateur/admin | ouvre la modale de création et persiste un brouillon |
| `/tournament publish` | organisateur/admin | publie les règles et le bouton d'inscription |
| `/tournament close` | organisateur/admin | clôture, génère le bracket et planifie le premier round |
| `/tournament status` | membre autorisé | affiche l'état et le récapitulatif |
| `/team apply` | membre du serveur | ouvre le brouillon d'équipe |
| `/team edit` | manager de l'équipe, avant clôture | modifie et reverifie les joueurs |
| `/match schedule` | manager concerné | propose ou confirme un horaire |
| `/match result` | manager concerné | soumet les statistiques progressives |
| `/staff application` | staff/admin | accepte, refuse, demande correction ou disqualifie |
| `/staff result` | staff/admin | valide, corrige, annule ou attribue un résultat |

## Composants et modales

`customId` est versionné et non sensible, par exemple `v1:team:add-player:<draftId>` ou `v1:staff:accept-application:<applicationId>`. Le routeur recharge l'entité et ne fait jamais confiance à l'identifiant seul.

- Création: modale courte avec nom, joueurs par équipe, niveau minimum optionnel, durée d'inscription, durée de round et format; le récapitulatif est confirmé par bouton.
- Équipe: modale nom/managers, puis boutons d'ajout d'un tag joueur; chaque tag est vérifié avant d'être confirmé.
- Résultat: modale étoiles, puis destruction et temps uniquement si l'égalité l'exige.
- Les brouillons, erreurs et données individuelles sont éphémères; publication, calendrier, annonces et résultat final sont publics dans le salon configuré.

## Accusé de réception et erreurs

Toute interaction est acquittée sous 3 secondes. Les appels Clash, transactions ou opérations Discord longues utilisent `deferReply`, puis `editReply`. Une erreur après acquittement est rendue par le chemin de suivi centralisé.

Les messages utilisateur ne contiennent ni stack trace, token, clé API, SQL ni données internes. Les erreurs métier indiquent l'action corrective attendue. Les erreurs staff incluent une référence d'audit sans exposer de secret.

## Salons de match

Un private thread est créé dans le salon parent configuré, accessible aux managers des deux équipes et au staff. Il contient l'affiche, l'échéance, les boutons de planification et de résultat. Si les permissions requises manquent, l'événement outbox échoue de manière visible et le match reste accessible via l'action de résultat.
