# Contrat de passerelle Clash of Clans

Le domaine dépend uniquement de ce port applicatif conceptuel:

```text
verifyPlayer(tag: string): Promise<VerifyPlayerResult>
```

## Résultats

`Verified` contient `normalizedTag`, `displayTag`, `name`, `townHallLevel`, `verifiedAt` et `source`. Les autres résultats sont contrôlés: `InvalidTag`, `NotFound`, `TownHallTooLow`, `RateLimited`, `TemporarilyUnavailable` et `ConfigurationError`.

Le port ne révèle pas les codes HTTP ni l'en-tête d'autorisation. L'adaptateur appelle `GET /v1/players/{urlEncodedTag}` avec le token fourni par l'environnement.

## Garanties

- Normalisation et validation syntaxique avant tout appel réseau.
- Cache positif de 10 minutes et cache 404 de 30 secondes; erreurs d'authentification, réseau et serveur non conservées comme joueurs.
- Limite globale configurable de 8 requêtes/seconde, 4 appels concurrents et file bornée à 100.
- Timeout total de 8 secondes et deux retries maximum avec backoff/jitter sur erreurs transitoires; `Retry-After` est respecté avec une borne.
- Une réponse valide est convertie en snapshot dans la candidature; une erreur laisse le joueur non confirmé.
- Les logs peuvent contenir catégorie, durée, tentatives et corrélation, mais jamais token ni en-tête `Authorization`.
