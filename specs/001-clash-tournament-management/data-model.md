# Modèle de données

Les identifiants sont des UUID ou des identifiants opaques générés par l'application. Les dates sont stockées en UTC. Les références Discord sont des données d'intégration, jamais la source des règles métier.

## ServerConfiguration

- `id`, `guildId` unique, `organizerRoleId` nullable, `staffRoleId` nullable, `rulesChannelId`, `announcementChannelId`, `matchParentChannelId`, `createdAt`, `updatedAt`.
- Validation: un serveur Discord ne peut avoir qu'une configuration active; les secrets ne sont pas stockés dans cette entité.

## Tournament

- `id`, `guildId`, `name`, `format` (`SINGLE_ELIMINATION` en v1), `status` (`DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`), `playersPerTeam` (1..10), `registrationStartsAt`, `registrationEndsAt`, `roundDuration`, `message`, `rulesMessageId`, `createdBy`, `createdAt`, `closedAt`, `completedAt`.
- Le champ `format` est un discriminant extensible : chaque nouveau format ajoute ses règles de progression sans modifier les attributs communs du tournoi.
- Relations: appartient à `ServerConfiguration`, contient des `TeamApplication` et des `Round`.
- Transitions: DRAFT reste fermé jusqu'à `registrationStartsAt`, puis devient `REGISTRATION_OPEN`; ensuite `REGISTRATION_OPEN -> REGISTRATION_CLOSED -> IN_PROGRESS -> COMPLETED -> ARCHIVED`. Une clôture interdit toute nouvelle composition.

## TeamApplication

- `id`, `tournamentId`, `name`, `status` (`DRAFT`, `PENDING`, `CHANGES_REQUESTED`, `ACCEPTED`, `REJECTED`, `DISQUALIFIED`), `submittedBy`, `submittedAt`, `decidedAt`, `decisionReason`, `decisionBy`, `version`.
- Relations: possède plusieurs `TeamManager` et exactement `playersPerTeam` `VerifiedPlayer` au moment de la soumission.
- Validation: nom non vide; managers appartenant au serveur; modification autorisée seulement avant clôture et selon le statut; décision staff avec motif obligatoire.

## TeamManager

- `applicationId`, `discordUserId`, `addedAt`; clé unique `(applicationId, discordUserId)`.
- Validation: au moins un manager à la soumission; un manager peut aussi être joueur.

## VerifiedPlayer

- `id`, `applicationId`, `normalizedTag`, `displayTag`, `nameSnapshot`, `townHallLevel`, `verifiedAt`, `verificationSource`.
- Validation: tag normalisé valide; niveau 1..18 lorsqu'il est retourné par le service; unicité `(tournamentId, normalizedTag)` sauf décision staff explicite; aucune ligne confirmée sans réponse valide de l'adaptateur Clash. Le niveau n'est pas une contrainte d'inscription.

## Round

- `id`, `tournamentId`, `number`, `status` (`PENDING`, `ACTIVE`, `RESOLVED`), `startsAt`, `deadline`, `completedAt`.
- Contraintes: numéro unique par tournoi; passage à `RESOLVED` uniquement quand tous les matchs sont résolus ou font l'objet d'une décision staff.
- En v1, le round porte les matchs d'un bracket d'élimination directe; les règles propres aux futurs formats restent isolées du modèle commun.

## Match

- `id`, `roundId`, `teamAId`, `teamBId` nullable pour représenter un bye, `status` (`SCHEDULED`, `ACTIVE`, `AWAITING_RESULT`, `CONTESTED`, `RESOLVED`, `CANCELLED`), `deadline`, `agreedAt`, `scheduledAt`, `privateSpaceId`, `winnerTeamId`, `resolutionReason`.
- Validation: un bye ne crée pas de faux match; un match normal a deux équipes distinctes; progression bloquée pour statut contradictoire ou incomplet.

## ResultSubmission

- `id`, `matchId`, `teamId`, `stars` (0..3 x joueurs par équipe), `averageDestruction` nullable (0..100), `averageAttackTimeMinutes` nullable (0..3), `status` (`SUBMITTED`, `VALIDATED`, `REJECTED`), `submittedBy`, `submittedAt`.
- Règle: ne demander la destruction qu'en cas d'égalité d'étoiles; ne demander le temps qu'en cas d'égalité persistante; temps inférieur gagne.

## StaffDecision

- `id`, `guildId`, `tournamentId`, `targetType`, `targetId`, `action`, `reason`, `actorDiscordUserId`, `createdAt`, `metadata`.
- Validation: auteur autorisé, motif non vide; append-only; couvre candidature, match, résultat, disqualification et attribution manuelle.

## AuditEvent

- `id`, `guildId`, `tournamentId`, `eventType`, `actorDiscordUserId` nullable, `aggregateType`, `aggregateId`, `payloadJson` validé, `createdAt`.
- Validation: jamais de token, secret ou en-tête d'autorisation dans le payload; conservation pendant la durée de vie du tournoi.

## OutboxEvent

- `id`, `guildId`, `tournamentId`, `eventType`, `payloadJson`, `status` (`PENDING`, `PROCESSING`, `SENT`, `FAILED`), `attempts`, `availableAt`, `lastError`, `createdAt`, `sentAt`.
- Validation: clé d'idempotence unique; traitement rejouable après redémarrage; échec Discord visible au staff.

## Draft

- `id`, `guildId`, `discordUserId`, `kind`, `status`, `payloadJson`, `expiresAt`, `version`, `createdAt`, `updatedAt`.
- Validation: expiration obligatoire; contrôle de version contre les doubles clics; aucune publication automatique sans confirmation explicite.
