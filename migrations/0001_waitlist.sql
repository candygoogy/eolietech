-- Pro waitlist. Data minimisation: only the address, the day it was added and which
-- consent text the person agreed to. No IPs, user agents or other metadata are stored.
CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,       -- UTC day, YYYY-MM-DD
  consent_version TEXT NOT NULL
);
