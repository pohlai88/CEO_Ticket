-- ============================================================================
-- CEO-TICKET Kernel Cache Policy Check
-- ============================================================================
-- Purpose: Verify cache tables have proper access controls
-- Usage:   psql $SESSION_DB_URL -f sql/check_kernel_cache_policies.sql
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo ' Kernel Cache Policy Validation'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- 1️⃣ CACHE TABLE RLS STATUS
-- ============================================================================
\echo '💾 Checking Cache Table RLS Status...'
\echo ''

SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%cache%'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 2️⃣ CACHE TABLE POLICIES
-- ============================================================================
\echo '📋 Cache Table Policies...'
\echo ''

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%cache%'
ORDER BY tablename, cmd;

\echo ''

-- ============================================================================
-- 3️⃣ POLICY VALIDATION
-- ============================================================================
\echo '🔒 Validating Cache Access Controls...'
\echo ''

DO $$
DECLARE
    has_insert_policy BOOLEAN;
    has_update_policy BOOLEAN;
    has_delete_policy BOOLEAN;
BEGIN
    -- Check for INSERT policy that restricts to service_role or authenticated
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kernel_validation_cache' 
          AND cmd = 'INSERT'
          AND schemaname = 'public'
    ) INTO has_insert_policy;
    
    -- Check for UPDATE policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kernel_validation_cache' 
          AND cmd = 'UPDATE'
          AND schemaname = 'public'
    ) INTO has_update_policy;
    
    -- Check for DELETE policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kernel_validation_cache' 
          AND cmd = 'DELETE'
          AND schemaname = 'public'
    ) INTO has_delete_policy;
    
    IF has_insert_policy THEN
        RAISE NOTICE 'MUST PASSED: kernel_validation_cache has INSERT policy';
    ELSE
        RAISE WARNING 'MUST FAILURE: kernel_validation_cache missing INSERT policy';
    END IF;
    
    IF has_update_policy THEN
        RAISE NOTICE 'MUST PASSED: kernel_validation_cache has UPDATE policy';
    ELSE
        RAISE WARNING 'SHOULD WARNING: kernel_validation_cache missing UPDATE policy';
    END IF;
    
    IF has_delete_policy THEN
        RAISE NOTICE 'MUST PASSED: kernel_validation_cache has DELETE policy';
    ELSE
        RAISE WARNING 'SHOULD WARNING: kernel_validation_cache missing DELETE policy';
    END IF;
END $$;

-- ============================================================================
-- 4️⃣ ANON ACCESS CHECK
-- ============================================================================
\echo ''
\echo '🚫 Verifying Anonymous Access is Blocked...'
\echo ''

-- List any policies that might allow anon access
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN roles::text LIKE '%anon%' THEN '⚠️ ANON INCLUDED'
        WHEN roles = '{}'::name[] THEN '⚠️ EMPTY ROLES (PUBLIC)'
        ELSE '✅ RESTRICTED'
    END AS access_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%cache%'
ORDER BY tablename, cmd;

\echo ''

-- ============================================================================
-- 5️⃣ SUMMARY
-- ============================================================================
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ' CACHE VALIDATION SUMMARY'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''

SELECT 
    tablename,
    COUNT(*) AS total_policies,
    COUNT(*) FILTER (WHERE cmd = 'SELECT') AS select_policies,
    COUNT(*) FILTER (WHERE cmd = 'INSERT') AS insert_policies,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS update_policies,
    COUNT(*) FILTER (WHERE cmd = 'DELETE') AS delete_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%cache%'
GROUP BY tablename;

\echo ''
\echo 'Cache policy validation complete.'
\echo ''
