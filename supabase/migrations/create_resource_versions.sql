-- Create resource_versions table
CREATE TABLE IF NOT EXISTS public.resource_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  external_link TEXT,
  updated_by TEXT NOT NULL,
  updated_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_resource_versions_resource_id ON public.resource_versions(resource_id);
CREATE INDEX idx_resource_versions_created_at ON public.resource_versions(created_at DESC);

-- Create a view to get the latest version number for each resource
CREATE OR REPLACE FUNCTION get_next_version_number(p_resource_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM public.resource_versions
  WHERE resource_id = p_resource_id;
$$ LANGUAGE SQL;

-- Enable RLS
ALTER TABLE public.resource_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view versions of resources they can see
CREATE POLICY "Users can view resource versions"
ON public.resource_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.resources
    WHERE resources.id = resource_versions.resource_id
    AND resources.deleted_at IS NULL
  )
);

-- Policy: Authenticated users can insert versions
CREATE POLICY "Authenticated users can create versions"
ON public.resource_versions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public.resource_versions TO authenticated;
GRANT INSERT ON public.resource_versions TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_version_number(UUID) TO authenticated;
