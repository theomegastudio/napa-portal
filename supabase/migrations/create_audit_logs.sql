-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  organization TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'downloaded', 'viewed'
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  resource_title TEXT,
  resource_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: NAPA admins can see all logs
CREATE POLICY "NAPA admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
    AND users.organization_name = 'National APIDA Panhellenic Association'
  )
);

-- Policy: Org admins can see their organization's logs
CREATE POLICY "Org admins can view their org audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
    AND users.organization_name = audit_logs.organization
  )
);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
