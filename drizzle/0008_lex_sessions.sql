-- Lex Autolease session storage for server-side API calls
CREATE TABLE IF NOT EXISTS "lex_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "session_cookies" text NOT NULL,
  "csrf_token" text NOT NULL,
  "profile_data" jsonb NOT NULL,
  "is_valid" boolean DEFAULT true,
  "last_used_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
