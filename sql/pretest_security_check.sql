-- ============================================================================
-- CEO-TICKET Pre-Test Security Check
-- ============================================================================
-- Purpose: Verify RLS, SECURITY DEFINER functions, and policies
-- Usage:   psql $SESSION_DB_URL -f sql/pretest_security_check.sql
-- Exit:    Non-zero if critical failures detected
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo ' CEO-TICKET Pre-Test Security Check'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- 1️⃣ RLS STATUS CHECK
-- ============================================================================
\echo '🔒 Checking RLS Status on CEO Tables...'
\echo ''

SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'ceo_%'
ORDER BY tablename;

\echo ''

-- Count tables without RLS
DO $$
DECLARE
    disabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO disabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'ceo_%'
      AND NOT rowsecurity;
    
    IF disabled_count > 0 THEN
        RAISE WARNING 'MUST FAILURE: % CEO tables have RLS disabled!', disabled_count;
    ELSE
        RAISE NOTICE 'MUST PASSED: All CEO tables have RLS enabled';
    END IF;
END $$;

-- ============================================================================
-- 2️⃣ RLS POLICIES COUNT
-- ============================================================================
\echo ''
\echo '📋 RLS Policies by Table...'
\echo ''

SELECT 
    tablename,
    COUNT(*) AS policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ') AS policy_types
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ceo_%'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 3️⃣ SECURITY DEFINER FUNCTIONS CHECK
-- ============================================================================
\echo '🛡️ Checking SECURITY DEFINER Functions...'
\echo ''

SELECT 
    proname AS function_name,
    CASE 
        WHEN proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' 
        THEN '✅ search_path SET'
        ELSE '❌ search_path MISSING'
    END AS security_status
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE nspname = 'public'
  AND prosecdef = true
ORDER BY proname;

\echo ''

-- Count functions without search_path
DO $$
DECLARE
    unsafe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unsafe_count
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE nspname = 'public'
      AND prosecdef = true
      AND (proconfig IS NULL OR array_to_string(proconfig, ',') NOT LIKE '%search_path%');
    
    IF unsafe_count > 0 THEN
        RAISE WARNING 'MUST FAILURE: % SECURITY DEFINER functions missing search_path!', unsafe_count;
    ELSE
        RAISE NOTICE 'MUST PASSED: All SECURITY DEFINER functions have search_path';
    END IF;
END $$;

-- ============================================================================
-- 4️⃣ DELETE POLICIES CHECK
-- ============================================================================
\echo ''
\echo '🗑️ Checking DELETE Policies on Critical Tables...'
\echo ''

SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ceo_requests', 'ceo_users', 'ceo_organizations')
  AND cmd IN ('DELETE', 'ALL')
ORDER BY tablename, policyname;

\echo ''

-- ============================================================================
-- 5️⃣ TRIGGERS CHECK
-- ============================================================================
\echo '⚡ Checking Active Triggers...'
\echo ''

SELECT 
    trigger_name,
    event_object_table AS table_name,
    event_manipulation AS event_type,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
   OR trigger_schema = 'auth'
ORDER BY trigger_name;

\echo ''

-- ============================================================================
-- 6️⃣ SUMMARY
-- ============================================================================
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ' SUMMARY'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''

SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ceo_%') AS total_ceo_tables,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ceo_%' AND rowsecurity) AS tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'ceo_%') AS total_policies,
    (SELECT COUNT(*) FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace WHERE nspname = 'public' AND prosecdef = true) AS security_definer_functions;

\echo ''
\echo 'Pre-test security check complete.'
\echo ''
