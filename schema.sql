-- Drop existing tables to allow re-running the script cleanly
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.tournament_state CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Create the teams table
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    player1 TEXT NOT NULL,
    player2 TEXT NOT NULL,
    service_id INTEGER NOT NULL CHECK (service_id IN (1, 2)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for teams and allow anonymous access for testing/admin
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Explicitly allow the 'anon' role to perform SELECT and INSERT on teams
CREATE POLICY "Allow anon select" ON public.teams FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON public.teams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON public.teams FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anon update" ON public.teams FOR UPDATE TO anon USING (true);

-- Realtime must be enabled for teams to sync to the public view and admin
ALTER PUBLICATION supabase_realtime ADD TABLE teams;

-- Create the matches table
CREATE TABLE public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id INTEGER NOT NULL CHECK (service_id IN (1, 2)),
    round INTEGER NOT NULL CHECK (round IN (16, 8, 4, 2)),
    table_number INTEGER NOT NULL CHECK (table_number IN (1, 2)),
    team1_id UUID REFERENCES public.teams(id),
    team2_id UUID REFERENCES public.teams(id),
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES public.teams(id),
    status TEXT DEFAULT 'pending'::text CHECK (status IN ('pending', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Realtime must be enabled for matches to sync to the TV
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous everything for matches" ON public.matches FOR ALL to anon USING (true) WITH CHECK (true);

-- Create the tournament_state table
CREATE TABLE public.tournament_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id INTEGER NOT NULL UNIQUE CHECK (service_id IN (1, 2)),
    timer_status TEXT DEFAULT 'stopped'::text CHECK (timer_status IN ('stopped', 'running')),
    timer_ends_at TIMESTAMP WITH TIME ZONE
);

ALTER PUBLICATION supabase_realtime ADD TABLE tournament_state;

ALTER TABLE public.tournament_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous everything for state" ON public.tournament_state FOR ALL to anon USING (true) WITH CHECK (true);

-- Insert the 2 singleton rows for our two services
INSERT INTO public.tournament_state (service_id) VALUES (1), (2);

-- Grant table-level permissions to the anon and authenticated roles
-- (Required for RLS policies to even be evaluated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_state TO anon, authenticated;
