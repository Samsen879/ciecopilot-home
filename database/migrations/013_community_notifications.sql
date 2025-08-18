-- Community notifications table and RLS policies

CREATE TABLE IF NOT EXISTS community_notifications (
	id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	notification_type TEXT NOT NULL DEFAULT 'general', -- general, reputation, answer, system
	title TEXT,
	message TEXT,
	link_url TEXT,
	metadata JSONB NOT NULL DEFAULT '{}',
	is_read BOOLEAN NOT NULL DEFAULT FALSE,
	read_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON community_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON community_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON community_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE community_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own notifications"
  ON community_notifications FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own notifications"
  ON community_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notifications"
  ON community_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own notifications"
  ON community_notifications FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


