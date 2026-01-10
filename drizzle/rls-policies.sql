-- ============================================
-- Row Level Security (RLS) Policies
-- Run this after the initial schema migration
-- ============================================

-- Enable RLS on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Application Role Setup
-- ============================================

-- Create app_user role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user;
  END IF;
END
$$;

-- ============================================
-- Resources Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS resources_select_policy ON resources;
DROP POLICY IF EXISTS resources_insert_policy ON resources;
DROP POLICY IF EXISTS resources_update_policy ON resources;
DROP POLICY IF EXISTS resources_delete_policy ON resources;

-- SELECT: Users can see resources from their org or if they're NAPA admin
CREATE POLICY resources_select_policy ON resources
  FOR SELECT
  USING (
    organization = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- INSERT: Users can create resources for their org
CREATE POLICY resources_insert_policy ON resources
  FOR INSERT
  WITH CHECK (
    organization = current_setting('app.current_organization', true)
  );

-- UPDATE: Users can update resources from their org (if admin) or NAPA admins
CREATE POLICY resources_update_policy ON resources
  FOR UPDATE
  USING (
    (organization = current_setting('app.current_organization', true)
     AND current_setting('app.is_org_admin', true)::boolean = true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- DELETE: Only org admins and NAPA admins can delete
CREATE POLICY resources_delete_policy ON resources
  FOR DELETE
  USING (
    (organization = current_setting('app.current_organization', true)
     AND current_setting('app.is_org_admin', true)::boolean = true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- ============================================
-- Resource Files Policies
-- ============================================

DROP POLICY IF EXISTS resource_files_select_policy ON resource_files;
DROP POLICY IF EXISTS resource_files_insert_policy ON resource_files;
DROP POLICY IF EXISTS resource_files_delete_policy ON resource_files;

-- SELECT: Inherits from parent resource via join
CREATE POLICY resource_files_select_policy ON resource_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_files.resource_id
      AND r.deleted_at IS NULL
      AND (
        r.organization = current_setting('app.current_organization', true)
        OR current_setting('app.is_napa_admin', true)::boolean = true
      )
    )
  );

-- INSERT: Can add files to resources in your org
CREATE POLICY resource_files_insert_policy ON resource_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_files.resource_id
      AND r.organization = current_setting('app.current_organization', true)
    )
  );

-- DELETE: Can delete files from resources in your org (if admin)
CREATE POLICY resource_files_delete_policy ON resource_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_files.resource_id
      AND (
        (r.organization = current_setting('app.current_organization', true)
         AND current_setting('app.is_org_admin', true)::boolean = true)
        OR current_setting('app.is_napa_admin', true)::boolean = true
      )
    )
  );

-- ============================================
-- Audit Logs Policies
-- ============================================

DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;

-- SELECT: Users can see their org's logs, NAPA admins see all
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (
    organization = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- INSERT: Anyone can insert audit logs (system operation)
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Resource Versions Policies
-- ============================================

DROP POLICY IF EXISTS resource_versions_select_policy ON resource_versions;
DROP POLICY IF EXISTS resource_versions_insert_policy ON resource_versions;

-- SELECT: Inherits from parent resource
CREATE POLICY resource_versions_select_policy ON resource_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_versions.resource_id
      AND (
        r.organization = current_setting('app.current_organization', true)
        OR current_setting('app.is_napa_admin', true)::boolean = true
      )
    )
  );

-- INSERT: Can add versions to resources in your org
CREATE POLICY resource_versions_insert_policy ON resource_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_versions.resource_id
      AND r.organization = current_setting('app.current_organization', true)
    )
  );

-- ============================================
-- Users Policies
-- ============================================

DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;

-- SELECT: Users can see members of their org, NAPA admins see all
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (
    organization_name = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
    OR id::text = current_setting('app.current_user_id', true)
  );

-- UPDATE: Users can update their own profile, admins can update org members
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (
    id::text = current_setting('app.current_user_id', true)
    OR (organization_name = current_setting('app.current_organization', true)
        AND current_setting('app.is_org_admin', true)::boolean = true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- ============================================
-- Grant Permissions to App User Role
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON resources TO app_user;
GRANT SELECT, INSERT, DELETE ON resource_files TO app_user;
GRANT SELECT, INSERT ON audit_logs TO app_user;
GRANT SELECT, INSERT ON resource_versions TO app_user;
GRANT SELECT, UPDATE ON users TO app_user;
GRANT SELECT ON organizations TO app_user;
GRANT SELECT ON accounts TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_user;
GRANT SELECT, INSERT, DELETE ON verification_tokens TO app_user;

-- ============================================
-- Helper Function: Get Next Version Number
-- ============================================

CREATE OR REPLACE FUNCTION get_next_version_number(p_resource_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM resource_versions
  WHERE resource_id = p_resource_id;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql;
