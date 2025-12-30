-- Create curriculum_nodes table as source of truth for syllabus structure
-- Part of Syllabus Boundary System (PR-1)

CREATE TABLE IF NOT EXISTS public.curriculum_nodes (
  node_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_code text NOT NULL,
  topic_path ltree NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_topic_path_gist 
  ON public.curriculum_nodes USING GIST (topic_path);
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_syllabus_code 
  ON public.curriculum_nodes (syllabus_code);

-- Add constraint to ensure topic_path follows canonical format (lowercase)
ALTER TABLE public.curriculum_nodes
  ADD CONSTRAINT chk_topic_path_canonical 
  CHECK (topic_path::text ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$');

-- Add constraint to prevent 'unmapped' as a valid curriculum node path
ALTER TABLE public.curriculum_nodes
  ADD CONSTRAINT chk_topic_path_not_unmapped
  CHECK (topic_path <> 'unmapped'::ltree);

-- Enable RLS
ALTER TABLE public.curriculum_nodes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.curriculum_nodes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.curriculum_nodes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.curriculum_nodes
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.curriculum_nodes
  FOR DELETE USING (auth.role() = 'authenticated');
