# Feature Specification: Gestion de tournois Clash of Clans sur Discord

**Feature Branch**: `001-clash-tournament-management`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: « Je souhaite créer un bot discord qui permet de gérer des tournois clash of clans. Je veux pouvoir créer un tournoi avec une commande et qu'ensuite une modale apparaisse pour définir les équipes, l'inscription, les rounds, les matchs et les résultats. »

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Créer et publier un tournoi (Priority: P1)

En tant qu'organisateur ou membre du staff autorisé, je veux créer un tournoi depuis Discord et renseigner ses règles afin que les joueurs disposent d'un cadre clair pour s'inscrire.

**Why this priority**: Sans tournoi configuré et publié, aucune inscription ni compétition ne peut commencer.

**Independent Test**: Créer un tournoi dans un serveur de test, compléter la modale, puis publier un message d'inscription visible par les membres autorisés du serveur.

**Acceptance Scenarios**:

1. **Given** un utilisateur autorisé dans un serveur Discord, **When** il lance la commande de création et valide la modale avec le nombre de joueurs par équipe, la durée d'inscription, la durée d'un round et le type de tournoi, **Then** un tournoi est créé avec le statut « inscriptions ouvertes » et un récapitulatif des règles est disponible.
2. **Given** un utilisateur renseigne un nombre de joueurs inférieur à 1 ou supérieur à 10, **When** il tente de valider la modale, **Then** la validation est refusée et la valeur attendue est indiquée.
3. **Given** un utilisateur configure un niveau minimum d'hôtel de ville, **When** la valeur est absente ou comprise entre 1 et 18, **Then** elle est acceptée comme contrainte facultative du tournoi ; si elle est absente, aucun niveau minimum ne s'applique.
4. **Given** un tournoi créé, **When** l'organisateur utilise la commande de publication, **Then** le bot envoie un message contenant les règles principales et un bouton d'inscription.

### User Story 2 - Déposer et modérer une inscription d'équipe (Priority: P1)

En tant que manager d'équipe, je veux inscrire une équipe en renseignant ses managers, son nom et ses joueurs afin de participer au tournoi. En tant que membre du staff, je veux accepter ou refuser chaque candidature afin de contrôler la liste des participants.

**Why this priority**: La composition fiable des équipes conditionne l'équité du tournoi et la génération du bracket.

**Independent Test**: Depuis le message publié, inscrire une équipe complète avec des tags valides, vérifier les données Clash of Clans, puis accepter ou refuser la candidature depuis l'interface staff.

**Acceptance Scenarios**:

1. **Given** un tournoi dont les inscriptions sont ouvertes, **When** un membre clique sur le bouton d'inscription, **Then** une modale lui demande le nom de l'équipe et les comptes managers, puis un parcours lui permet d'ajouter le nombre requis de joueurs.
2. **Given** un tag Clash of Clans saisi, **When** il est ajouté à l'équipe, **Then** le bot vérifie le tag auprès du service Clash of Clans, récupère le pseudo et le niveau d'hôtel de ville retournés, puis les affiche avant confirmation ; le niveau n'est jamais saisi manuellement par le manager.
3. **Given** un tag invalide, introuvable ou temporairement non vérifiable, **When** le joueur est ajouté, **Then** le joueur n'est pas confirmé dans l'équipe et une erreur explicite permet de corriger ou réessayer.
4. **Given** une candidature complète et valide, **When** elle est soumise, **Then** elle passe au statut « en attente » et seuls les membres du staff autorisés peuvent l'accepter ou la refuser.
5. **Given** une candidature encore en attente avant la clôture des inscriptions, **When** le manager utilise la commande de modification, **Then** il peut modifier le nom, les managers ou les joueurs, et toute modification d'un joueur déclenche une nouvelle vérification.
6. **Given** une candidature acceptée, **When** le manager tente de la modifier après la clôture des inscriptions, **Then** la modification est refusée et la composition retenue est conservée pour le tournoi.

### User Story 3 - Organiser les rounds et les horaires de match (Priority: P1)

En tant que participant, je veux connaître mon adversaire et convenir d'une date de match dans un espace privé afin de jouer chaque round dans les délais.

**Why this priority**: Le déroulement coordonné des matchs est le cœur opérationnel du tournoi.

**Independent Test**: Clôturer un tournoi de test avec suffisamment d'équipes acceptées, vérifier la génération d'un premier bracket, puis constater la création d'un espace de discussion pour un match.

**Acceptance Scenarios**:

1. **Given** que la durée d'inscription est écoulée, **When** le tournoi est clôturé, **Then** le bot exclut les candidatures non acceptées, génère aléatoirement les affiches du premier round et publie le calendrier ou les matchs concernés.
2. **Given** un match planifié, **When** le round commence, **Then** un salon privé est créé ou rendu accessible aux managers des deux équipes et au staff, avec la date limite du round.
3. **Given** les managers des deux équipes, **When** ils proposent et valident une date et une heure dans leur salon de match, **Then** l'horaire retenu est visible par les deux équipes et le staff.
4. **Given** qu'un round est terminé, **When** tous ses matchs ont un résultat validé ou qu'une décision staff est enregistrée, **Then** le round suivant est généré avec les vainqueurs et les espaces de match correspondants.
5. **Given** un nombre impair d'équipes dans un format qui le permet, **When** le bracket est généré, **Then** le système applique une règle de bye explicite et notifie l'équipe concernée sans créer de faux match.

### User Story 4 - Saisir, vérifier et départager un résultat (Priority: P1)

En tant que manager, je veux déclarer le résultat de mon match avec les statistiques prévues afin que le vainqueur soit déterminé de manière uniforme.

**Why this priority**: Les résultats fiables sont nécessaires pour faire progresser le bracket et éviter les litiges.

**Independent Test**: Sur un match de test, saisir un résultat pour chaque équipe ou faire valider une déclaration par le staff, puis vérifier le calcul du vainqueur selon les critères de départage.

**Acceptance Scenarios**:

1. **Given** un match actif, **When** un manager saisit le nombre d'étoiles pour son équipe, **Then** le bot contrôle cette valeur et l'associe au match ; si elle suffit à départager les équipes, aucune autre statistique n'est demandée.
2. **Given** que les deux équipes sont à égalité sur le nombre d'étoiles, **When** le bot demande le pourcentage moyen de destruction, **Then** les managers peuvent saisir cette valeur comprise entre 0 et 100 ; si elle suffit à départager les équipes, le temps moyen d'attaque n'est pas demandé.
3. **Given** que les deux équipes sont encore à égalité sur le nombre d'étoiles et le pourcentage moyen de destruction, **When** le bot demande le temps moyen d'attaque, **Then** les managers peuvent saisir une valeur comprise entre 0 et 3 minutes, qui constitue le dernier critère de départage.
4. **Given** que les deux équipes ont fourni les statistiques nécessaires, **When** le bot compare les résultats, **Then** l'équipe ayant le plus d'étoiles gagne ; uniquement en cas d'égalité, l'équipe ayant le pourcentage moyen de destruction le plus élevé gagne ; uniquement en cas d'égalité persistante, l'équipe ayant le temps moyen d'attaque le plus faible gagne.
5. **Given** une déclaration envoyée par une seule équipe ou un résultat contesté, **When** le délai du match arrive à échéance ou le staff intervient, **Then** le staff peut valider, corriger ou attribuer le résultat avec une trace de la décision.
6. **Given** une statistique requise par une égalité n'est pas fournie ou est incohérente, **When** le manager soumet sa déclaration, **Then** elle est refusée sans faire progresser le bracket et le champ attendu est indiqué.

### User Story 5 - Annoncer la fin du tournoi (Priority: P2)

En tant qu'organisateur, je veux qu'un message final récapitule le tournoi et ses gagnants afin que les participants et la communauté connaissent le résultat officiel.

**Why this priority**: Une clôture visible donne une conclusion claire au tournoi et conserve son historique.

**Independent Test**: Terminer tous les matchs d'un tournoi de test et vérifier la publication automatique d'un résultat final contenant le podium ou le vainqueur.

**Acceptance Scenarios**:

1. **Given** que le dernier match est validé, **When** le dernier round se termine, **Then** le tournoi passe au statut « terminé » et un message final est publié dans le salon configuré.
2. **Given** un tournoi terminé, **When** un membre consulte son récapitulatif, **Then** il voit le vainqueur, les équipes classées et les résultats des rounds disponibles.

### Edge Cases

- Une commande de création ou de publication est exécutée par un membre sans permission : l'action est refusée et aucune donnée de tournoi n'est modifiée.
- Deux inscriptions utilisent le même tag joueur dans le même tournoi : la seconde inscription est refusée ou signalée au staff selon le statut de la première.
- Un joueur ne correspond pas au niveau d'hôtel de ville minimum défini : l'ajout est refusé avec une raison lisible ; si aucun minimum n'est défini, tout niveau d'hôtel de ville retourné par l'API est accepté.
- Le service Clash of Clans est indisponible, dépasse son quota ou répond trop lentement : l'équipe reste incomplète jusqu'à une nouvelle tentative, sans créer de joueur non vérifié.
- Une modale Discord ne peut pas contenir toute la composition de l'équipe : l'inscription est réalisée par étapes et reste brouillonne jusqu'à soumission explicite.
- Le créateur ferme ou annule la modale : aucun tournoi incomplet n'est publié.
- La durée d'inscription ou d'un round expire pendant une saisie : le bot refuse la soumission tardive et informe l'utilisateur du statut actuel.
- Une équipe se désiste, est disqualifiée ou devient incomplète avant un round : le staff peut appliquer une décision documentée et le bracket est recalculé ou avance selon les règles publiées.
- Les deux équipes déclarent des résultats différents pour le même match : le résultat reste en attente et une décision staff est requise.
- Une équipe ne fournit pas le pourcentage après une égalité sur les étoiles, ou le temps après une égalité sur les étoiles et le pourcentage : le résultat reste incomplet et le round ne progresse pas.
- Une égalité persiste après les trois critères de départage : le match est bloqué pour décision du staff, sans vainqueur automatique implicite.
- Un salon de match ne peut pas être créé ou est supprimé : le staff est alerté et le match reste accessible via le salon de résultats.
- Un tournoi est archivé ou terminé : les résultats restent consultables sans permettre de nouvelles inscriptions ou modifications.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST permettre à un membre autorisé de créer un tournoi depuis une commande Discord.
- **FR-002**: Le système MUST demander, lors de la création, le nombre de joueurs par équipe entre 1 et 10, un niveau minimum d'hôtel de ville facultatif entre 1 et 18, la durée d'inscription, la durée de chaque round et le type de tournoi.
- **FR-003**: Le système MUST permettre à l'organisateur d'ajouter un message facultatif et MUST afficher un récapitulatif avant la publication du tournoi.
- **FR-004**: Le système MUST prendre en charge au minimum les formats KOTH et élimination directe, et MUST afficher le format retenu dans les règles du tournoi.
- **FR-005**: Le système MUST publier un message d'inscription contenant un bouton ou une action clairement identifiable pour rejoindre le tournoi.
- **FR-006**: Le système MUST permettre à un membre d'inscrire une équipe avec un nom, un ou plusieurs managers Discord et le nombre de joueurs prévu par le tournoi.
- **FR-007**: Le système MUST vérifier chaque tag Clash of Clans auprès du service officiel avant de confirmer le joueur, puis MUST afficher le tag, le pseudo et le niveau d'hôtel de ville vérifiés.
- **FR-008**: Le système MUST refuser les tags invalides, les joueurs non vérifiables et les joueurs dont le niveau d'hôtel de ville récupéré est inférieur au minimum configuré, avec un message permettant de corriger l'inscription ; si aucun minimum n'est configuré, aucun joueur ne peut être refusé sur son niveau d'hôtel de ville.
- **FR-009**: Le système MUST empêcher un même joueur d'être inscrit dans plusieurs équipes du même tournoi, sauf décision explicite du staff.
- **FR-010**: Le système MUST permettre aux managers de modifier le nom, les managers et les joueurs d'une candidature avant la clôture des inscriptions, avec une nouvelle vérification des joueurs modifiés.
- **FR-011**: Le système MUST permettre au staff autorisé d'accepter, refuser, demander une correction ou disqualifier une candidature, et MUST conserver le motif et l'auteur de la décision.
- **FR-012**: Le système MUST empêcher toute nouvelle inscription ou modification de composition après la clôture des inscriptions.
- **FR-013**: À la clôture des inscriptions, le système MUST inclure uniquement les équipes acceptées, générer aléatoirement le premier bracket et appliquer une règle publiée pour les équipes sans adversaire.
- **FR-014**: Le système MUST créer pour chaque match un espace privé accessible aux managers des deux équipes et au staff, contenant les informations du match et sa date limite.
- **FR-015**: Le système MUST permettre aux deux équipes de proposer et confirmer une date et une heure de match, et MUST rendre l'accord visible aux parties autorisées.
- **FR-016**: Le système MUST proposer un espace ou une action spécifique pour déclarer les résultats de chaque match.
- **FR-017**: Le système MUST accepter pour chaque équipe un nombre d'étoiles compris entre 0 et 3 fois le nombre de joueurs ; en cas d'égalité sur les étoiles, il MUST demander un pourcentage moyen de destruction compris entre 0 et 100 ; en cas d'égalité persistante, il MUST demander un temps moyen d'attaque compris entre 0 et 3 minutes.
- **FR-018**: Le système MUST déterminer le vainqueur selon une hiérarchie conditionnelle : l'équipe ayant le plus d'étoiles gagne en premier ; uniquement en cas d'égalité sur les étoiles, l'équipe ayant le pourcentage moyen de destruction le plus élevé gagne ; uniquement en cas d'égalité sur les deux critères précédents, l'équipe ayant le temps moyen d'attaque le plus faible gagne ; il MUST ne pas exiger les critères suivants lorsqu'un vainqueur est déjà déterminé.
- **FR-019**: Le système MUST bloquer la progression automatique lorsqu'un résultat est contradictoire, invalide ou encore soumis à validation staff.
- **FR-020**: Le système MUST permettre au staff de valider, corriger, annuler ou attribuer un résultat, en conservant la décision et son motif.
- **FR-021**: Le système MUST générer le round suivant à partir des vainqueurs dès que le round précédent est entièrement résolu, jusqu'à la fin du tournoi.
- **FR-022**: Le système MUST notifier les équipes et le staff des changements de statut importants : candidature, décision staff, clôture, match, échéance, résultat et fin du tournoi.
- **FR-023**: Le système MUST publier à la fin du tournoi un message contenant au minimum le vainqueur, le classement final disponible et un récapitulatif des résultats.
- **FR-024**: Le système MUST limiter les commandes de gestion, de modération et de résultat aux rôles ou permissions autorisés dans le serveur concerné.
- **FR-025**: Le système MUST présenter aux utilisateurs des messages d'erreur compréhensibles et MUST ne jamais exposer de secret, de clé d'accès ou de donnée interne sensible.
- **FR-026**: Le système MUST gérer les échecs et limites du service Clash of Clans sans créer de joueur confirmé à partir de données non vérifiées, et MUST permettre une nouvelle tentative contrôlée.
- **FR-027**: Le système MUST conserver un historique consultable des équipes, décisions, matchs, résultats et actions staff pendant toute la durée de vie du tournoi.

### Key Entities

- **Tournoi**: compétition créée par un organisateur, avec un statut, un format, une taille d'équipe, des contraintes de niveau, des durées, un message et un historique.
- **Candidature d'équipe**: demande d'inscription composée d'un nom, de managers Discord, de joueurs vérifiés, d'un statut et des décisions du staff.
- **Joueur Clash of Clans**: identité issue d'un tag vérifié par le service Clash of Clans, comprenant au minimum le tag, le pseudo et le niveau d'hôtel de ville récupérés au moment de l'inscription.
- **Round**: étape ordonnée du tournoi, avec une période, des matchs et un état de progression.
- **Match**: confrontation entre deux équipes, avec un horaire convenu, un espace de discussion, une échéance et un résultat.
- **Résultat**: déclaration progressive des statistiques nécessaires des équipes, état de validation, vainqueur et éventuelle décision staff.
- **Décision staff**: action autorisée sur une candidature, un match ou un résultat, avec auteur, date, motif et conséquence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un organisateur autorisé peut créer et publier un tournoi complet en moins de 5 minutes, hors temps de saisie des équipes.
- **SC-002**: Au moins 95 % des tags valides testés sont confirmés ou rejetés avec une réponse compréhensible en moins de 10 secondes lorsque le service externe est disponible.
- **SC-003**: 100 % des candidatures acceptées au moment de la clôture ont un nombre de joueurs conforme au tournoi et des tags vérifiés.
- **SC-004**: Pour un tournoi de 32 équipes ou moins, le bracket du premier round et les espaces de match sont disponibles dans les 60 secondes suivant la clôture des inscriptions.
- **SC-005**: 95 % des résultats valides sont acceptés dès la première soumission et le vainqueur est déterminé sans intervention manuelle lorsque les critères ne sont pas à égalité.
- **SC-006**: Aucune équipe ne progresse vers le round suivant tant que son match précédent n'a pas un résultat valide ou une décision staff enregistrée.
- **SC-007**: 100 % des actions de staff et des modifications de candidature sont consultables dans l'historique du tournoi.
- **SC-008**: Dans un test d'acceptation, au moins 90 % des participants trouvent l'inscription, la consultation du match et la déclaration de résultat sans assistance externe.
- **SC-009**: Le message final est publié dans les 60 secondes suivant la validation du dernier match et indique le vainqueur ainsi que le classement disponible.

## Assumptions

- Le bot fonctionne dans un ou plusieurs serveurs Discord, chaque serveur administrant ses propres tournois et permissions.
- Les commandes, modales, boutons et salons Discord sont les moyens d'interaction retenus pour la v1.
- Les managers sont identifiés par leurs comptes Discord et les joueurs par leurs tags Clash of Clans ; un manager peut également être joueur.
- Le rôle ou la permission autorisant l'organisateur et le staff est configurable par serveur ; à défaut, les administrateurs Discord sont autorisés.
- La v1 prend en charge KOTH et élimination directe ; les autres formats pourront être ajoutés sans modifier les données communes du tournoi.
- La règle par défaut en cas d'égalité persistante après étoiles, destruction et temps est une décision du staff, sans tirage automatique ; les comparaisons utilisent respectivement la valeur la plus élevée, la valeur la plus élevée, puis la valeur la plus faible.
- Le staff dispose d'une action de correction ou de disqualification pour les cas exceptionnels, avec motif obligatoire.
- Les durées sont exprimées dans une unité choisie au moment de la saisie et affichées dans le récapitulatif ; les valeurs sont converties en échéances cohérentes.
- Les données retournées par le service Clash of Clans peuvent évoluer ; la vérification réalisée à l'inscription constitue la référence de la candidature, sauf nouvelle vérification demandée par le staff.
- Les secrets Discord et Clash of Clans sont fournis par la configuration sécurisée de l'environnement et ne sont jamais inclus dans les messages ou l'historique.
- Les règles et le calendrier sont publiés dans les salons configurés par l'organisateur ; la création d'un salon privé de match dépend des permissions du bot.
- Les statistiques de match sont collectées progressivement selon la hiérarchie de départage ; les critères suivants restent absents lorsqu'un critère supérieur désigne déjà le vainqueur.
- L'archivage et la suppression définitive des anciennes données ne font pas partie de la première version ; la conservation doit rester compatible avec les règles du serveur.
