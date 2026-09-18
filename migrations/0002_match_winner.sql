-- Persists the winning team of a resolved match so final standings, completion and recaps
-- can be recomputed after a restart without replaying result submissions.
ALTER TABLE MatchRecord ADD COLUMN winnerTeamApplicationId TEXT;
