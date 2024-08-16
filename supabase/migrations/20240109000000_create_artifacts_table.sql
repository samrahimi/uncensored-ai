-- Create artifacts table
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content JSONB NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artifacts are viewable by workspace members and public artifacts are viewable by everyone"
  ON artifacts
  FOR SELECT
  USING (
    (workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )) OR is_public
  );

CREATE POLICY "Users can insert artifacts into their workspaces"
  ON artifacts
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update artifacts in their workspaces"
  ON artifacts
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updating the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON artifacts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();