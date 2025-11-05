-- Add type_specific_properties column to resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS type_specific_properties JSONB DEFAULT '{}';
