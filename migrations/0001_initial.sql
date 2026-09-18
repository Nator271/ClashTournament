PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS ServerConfiguration (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  leagueName TEXT NOT NULL,
  organizerRoleId TEXT,
  staffRoleId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(guildId)
);

CREATE TABLE IF NOT EXISTS Tournament (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  organizerId TEXT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  playersPerTeam INTEGER NOT NULL,
  registrationStartsAt TEXT NOT NULL,
  registrationEndsAt TEXT NOT NULL,
  roundDurationMinutes INTEGER NOT NULL,
  optionalMessage TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS TeamApplication (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  name TEXT NOT NULL,
  createdByUserId TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tournamentId) REFERENCES Tournament(id)
);

CREATE TABLE IF NOT EXISTS TeamManager (
  id TEXT PRIMARY KEY,
  teamApplicationId TEXT NOT NULL,
  discordUserId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(teamApplicationId, discordUserId),
  FOREIGN KEY (teamApplicationId) REFERENCES TeamApplication(id)
);

CREATE TABLE IF NOT EXISTS VerifiedPlayer (
  id TEXT PRIMARY KEY,
  teamApplicationId TEXT NOT NULL,
  tournamentId TEXT NOT NULL,
  tag TEXT NOT NULL,
  displayName TEXT NOT NULL,
  townHallLevel INTEGER NOT NULL,
  verifiedAt TEXT NOT NULL,
  UNIQUE(tournamentId, tag),
  FOREIGN KEY (teamApplicationId) REFERENCES TeamApplication(id),
  FOREIGN KEY (tournamentId) REFERENCES Tournament(id)
);

CREATE TABLE IF NOT EXISTS Round (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  indexNumber INTEGER NOT NULL,
  state TEXT NOT NULL,
  startsAt TEXT,
  endsAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(tournamentId, indexNumber),
  FOREIGN KEY (tournamentId) REFERENCES Tournament(id)
);

CREATE TABLE IF NOT EXISTS MatchRecord (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  roundId TEXT NOT NULL,
  homeTeamApplicationId TEXT,
  awayTeamApplicationId TEXT,
  status TEXT NOT NULL,
  scheduledFor TEXT,
  threadId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (tournamentId) REFERENCES Tournament(id),
  FOREIGN KEY (roundId) REFERENCES Round(id)
);

CREATE TABLE IF NOT EXISTS ResultSubmission (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL,
  teamApplicationId TEXT NOT NULL,
  stars INTEGER NOT NULL,
  destructionPercent REAL,
  attackMinutes REAL,
  submittedByUserId TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (matchId) REFERENCES MatchRecord(id)
);

CREATE TABLE IF NOT EXISTS StaffDecision (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  targetType TEXT NOT NULL,
  targetId TEXT NOT NULL,
  actorUserId TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (tournamentId) REFERENCES Tournament(id)
);

CREATE TABLE IF NOT EXISTS AuditEvent (
  id TEXT PRIMARY KEY,
  tournamentId TEXT,
  eventType TEXT NOT NULL,
  actorUserId TEXT,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS OutboxEvent (
  id TEXT PRIMARY KEY,
  aggregateType TEXT NOT NULL,
  aggregateId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  payload TEXT NOT NULL,
  processedAt TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Draft (
  id TEXT PRIMARY KEY,
  guildId TEXT NOT NULL,
  organizerId TEXT NOT NULL,
  data TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
