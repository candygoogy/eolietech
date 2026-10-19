-- Pro waitlist: the language of the page the person signed up on ("en" or "it"), so the launch
-- email reaches them in that language. Data minimisation: just the two-letter site locale, nothing
-- taken from the browser (no Accept-Language, no country). Rows from before this column read "en".
ALTER TABLE waitlist ADD COLUMN locale TEXT NOT NULL DEFAULT 'en';
