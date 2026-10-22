-- Migration: Restrict exec_sql to service_role only.
-- exec_sql is SECURITY DEFINER and can run arbitrary SQL, so it must never be
-- callable with the public anon/authenticated roles (the anon key is public
-- by design and cannot be treated as a secret).
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
