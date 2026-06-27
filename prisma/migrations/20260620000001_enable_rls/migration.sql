-- Enable Row Level Security on all tables.
--
-- The app connects via the `postgres` superuser (or `service_role`), both of
-- which bypass RLS automatically in Supabase — so Prisma is unaffected.
-- Enabling RLS without permissive policies blocks the `anon` and `authenticated`
-- Supabase roles by default, which is correct: no client-side Supabase SDK is
-- used; all DB access goes through Prisma server-side only.

ALTER TABLE "Account"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alternative"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransitionOrder"   ENABLE ROW LEVEL SECURITY;
