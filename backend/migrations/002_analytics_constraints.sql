-- Canonical analytics schema. Run through scripts/migrate_db.py, not directly.
-- The runner disables foreign keys BEFORE BEGIN IMMEDIATE, checks dependencies,
-- rolls back on any error, checks all foreign keys and restores enforcement.
-- All old rows are copied and validated BEFORE either original table is dropped.
CREATE TABLE anonymous_sessions_v2 (
    session_id TEXT NOT NULL PRIMARY KEY CHECK (length(session_id) = 36 AND session_id = lower(session_id)
        AND substr(session_id, 9, 1) = '-' AND substr(session_id, 14, 1) = '-'
        AND substr(session_id, 19, 1) = '-' AND substr(session_id, 24, 1) = '-'
        AND length(replace(session_id, '-', '')) = 32
        AND replace(session_id, '-', '') NOT GLOB '*[^0-9a-f]*'
        AND substr(session_id, 15, 1) = '4' AND substr(session_id, 20, 1) IN ('8', '9', 'a', 'b')),
    consent_granted INTEGER NOT NULL DEFAULT 1
        CHECK (typeof(consent_granted) = 'integer' AND consent_granted IN (0, 1)),
    created_at TEXT NOT NULL CHECK (length(created_at) = 24
        AND created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
        AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 seconds') IS NOT NULL
        AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+0 seconds') = created_at),
    last_seen_at TEXT NOT NULL CHECK (length(last_seen_at) = 24
        AND last_seen_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
        AND strftime('%Y-%m-%dT%H:%M:%fZ', last_seen_at, '+0 seconds') IS NOT NULL
        AND strftime('%Y-%m-%dT%H:%M:%fZ', last_seen_at, '+0 seconds') = last_seen_at),
    CHECK (last_seen_at >= created_at)
);
CREATE TABLE visit_events_v2 (
    id TEXT NOT NULL PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)
        AND substr(id, 9, 1) = '-' AND substr(id, 14, 1) = '-'
        AND substr(id, 19, 1) = '-' AND substr(id, 24, 1) = '-'
        AND length(replace(id, '-', '')) = 32
        AND replace(id, '-', '') NOT GLOB '*[^0-9a-f]*'
        AND substr(id, 15, 1) = '4' AND substr(id, 20, 1) IN ('8', '9', 'a', 'b')),
    session_id TEXT REFERENCES anonymous_sessions(session_id) ON DELETE SET NULL,
    started_at TEXT NOT NULL CHECK (length(started_at) = 24
        AND started_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
        AND strftime('%Y-%m-%dT%H:%M:%fZ', started_at, '+0 seconds') IS NOT NULL
        AND strftime('%Y-%m-%dT%H:%M:%fZ', started_at, '+0 seconds') = started_at)
);
INSERT INTO anonymous_sessions_v2 SELECT session_id, consent_granted, created_at, last_seen_at FROM anonymous_sessions;
INSERT INTO visit_events_v2 SELECT id, session_id, started_at FROM visit_events;
DROP TABLE visit_events;
DROP TABLE anonymous_sessions;
ALTER TABLE anonymous_sessions_v2 RENAME TO anonymous_sessions;
ALTER TABLE visit_events_v2 RENAME TO visit_events;
CREATE INDEX idx_anonymous_sessions_last_seen_at ON anonymous_sessions(last_seen_at);
CREATE INDEX idx_visit_events_session_id ON visit_events(session_id);
CREATE INDEX idx_visit_events_started_at ON visit_events(started_at);
PRAGMA user_version = 2;
