-- SQLite schema theo PRD. Bật foreign_keys trên từng kết nối trước khi sử dụng.
BEGIN IMMEDIATE;

CREATE TABLE admin_accounts (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE CHECK (length(trim(username)) > 0),
    password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE admin_sessions (
    id TEXT NOT NULL PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) > 0),
    issued_at TEXT NOT NULL,
    expires_at TEXT NOT NULL CHECK (expires_at > issued_at),
    revoked_at TEXT
);

CREATE TABLE categories (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    normalized_name TEXT NOT NULL UNIQUE CHECK (length(trim(normalized_name)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE pois (
    id TEXT NOT NULL PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    address TEXT NOT NULL CHECK (length(trim(address)) > 0),
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    radius_m INTEGER NOT NULL DEFAULT 100 CHECK (radius_m BETWEEN 20 AND 1000),
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE poi_narrations (
    id TEXT NOT NULL PRIMARY KEY,
    poi_id TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (length(trim(locale)) > 0),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (poi_id, locale)
);

CREATE TABLE anonymous_sessions (
    session_id TEXT NOT NULL PRIMARY KEY,
    consent_granted INTEGER NOT NULL CHECK (consent_granted IN (0, 1)),
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE visit_events (
    id TEXT NOT NULL PRIMARY KEY,
    session_id TEXT REFERENCES anonymous_sessions(session_id) ON DELETE SET NULL,
    started_at TEXT NOT NULL
);

CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_pois_category_id ON pois(category_id);
CREATE INDEX idx_anonymous_sessions_last_seen_at ON anonymous_sessions(last_seen_at);
CREATE INDEX idx_visit_events_session_id ON visit_events(session_id);
CREATE INDEX idx_visit_events_started_at ON visit_events(started_at);

COMMIT;
