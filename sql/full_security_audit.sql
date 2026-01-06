-- ============================================================================
-- CEO-TICKET Full Security Audit
-- ============================================================================
-- Purpose: Comprehensive security audit of the CEO-TICKET database
-- Usage:   psql $SESSION_DB_URL -f sql/full_security_audit.sql
-- Output:  Detailed security report with MUST/SHOULD status
-- ============================================================================

\echo ''
\echo '╔══════════════════════════════════════════════════════════════════════╗'
\echo '║           CEO-TICKET FULL SECURITY AUDIT                             ║'
\echo '║           Date: ' || now()::date || '                                            ║'
\echo '╚══════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================================
-- SECTION 1: TABLE INVENTORY
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 1: CEO TABLE INVENTORY                                       │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    tablename AS "Table Name",
    CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END AS "RLS Enabled",
    CASE WHEN hasindexes THEN 'Yes' ELSE 'No' END AS "Indexed",
    CASE WHEN hastriggers THEN 'Yes' ELSE 'No' END AS "Has Triggers"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'ceo_%'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- SECTION 2: RLS POLICY DETAILS
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 2: RLS POLICY DETAILS                                        │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    tablename AS "Table",
    policyname AS "Policy Name",
    CASE permissive WHEN 'PERMISSIVE' THEN 'Permissive' ELSE 'Restrictive' END AS "Type",
    array_to_string(roles, ', ') AS "Roles",
    cmd AS "Command"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ceo_%'
ORDER BY tablename, cmd, policyname;

\echo ''

-- Policy count summary
\echo 'Policy Summary by Table:'
SELECT 
    tablename AS "Table",
    COUNT(*) AS "Total",
    COUNT(*) FILTER (WHERE cmd = 'SELECT') AS "SELECT",
    COUNT(*) FILTER (WHERE cmd = 'INSERT') AS "INSERT",
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS "UPDATE",
    COUNT(*) FILTER (WHERE cmd = 'DELETE') AS "DELETE",
    COUNT(*) FILTER (WHERE cmd = 'ALL') AS "ALL"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ceo_%'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- SECTION 3: SECURITY DEFINER FUNCTIONS
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 3: SECURITY DEFINER FUNCTIONS                                │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    proname AS "Function Name",
    CASE 
        WHEN proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' 
        THEN '✅ Configured'
        ELSE '❌ MISSING'
    END AS "search_path",
    pg_get_function_identity_arguments(pg_proc.oid) AS "Arguments"
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE nspname = 'public'
  AND prosecdef = true
ORDER BY proname;

\echo ''

-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 4: DATABASE TRIGGERS                                         │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    trigger_name AS "Trigger Name",
    event_object_schema || '.' || event_object_table AS "Table",
    event_manipulation AS "Event",
    action_timing AS "Timing",
    action_statement AS "Action"
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================================================
-- SECTION 5: EXTENSIONS
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 5: INSTALLED EXTENSIONS                                      │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    extname AS "Extension",
    extversion AS "Version",
    n.nspname AS "Schema"
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

\echo ''

-- ============================================================================
-- SECTION 6: SOFT DELETE COLUMNS
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 6: SOFT DELETE COLUMN CHECK                                  │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    t.tablename AS "Table",
    CASE WHEN c_deleted_at.column_name IS NOT NULL THEN '✅' ELSE '❌' END AS "deleted_at",
    CASE WHEN c_deleted_by.column_name IS NOT NULL THEN '✅' ELSE '❌' END AS "deleted_by"
FROM pg_tables t
LEFT JOIN information_schema.columns c_deleted_at 
    ON c_deleted_at.table_schema = 'public' 
    AND c_deleted_at.table_name = t.tablename 
    AND c_deleted_at.column_name = 'deleted_at'
LEFT JOIN information_schema.columns c_deleted_by 
    ON c_deleted_by.table_schema = 'public' 
    AND c_deleted_by.table_name = t.tablename 
    AND c_deleted_by.column_name = 'deleted_by'
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'ceo_%'
ORDER BY t.tablename;

\echo ''

-- ============================================================================
-- SECTION 7: MUST/SHOULD VALIDATION
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 7: MUST/SHOULD VALIDATION RESULTS                            │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

DO $$
DECLARE
    must_failures INTEGER := 0;
    should_warnings INTEGER := 0;
    rls_disabled INTEGER;
    missing_search_path INTEGER;
    missing_delete_policy INTEGER;
BEGIN
    -- MUST: All CEO tables have RLS enabled
    SELECT COUNT(*) INTO rls_disabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'ceo_%'
      AND NOT rowsecurity;
    
    IF rls_disabled > 0 THEN
        RAISE WARNING '[MUST FAIL] % CEO tables have RLS disabled', rls_disabled;
        must_failures := must_failures + 1;
    ELSE
        RAISE NOTICE '[MUST PASS] All CEO tables have RLS enabled';
    END IF;
    
    -- MUST: All SECURITY DEFINER functions have search_path
    SELECT COUNT(*) INTO missing_search_path
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE nspname = 'public'
      AND prosecdef = true
      AND (proconfig IS NULL OR array_to_string(proconfig, ',') NOT LIKE '%search_path%');
    
    IF missing_search_path > 0 THEN
        RAISE WARNING '[MUST FAIL] % SECURITY DEFINER functions missing search_path', missing_search_path;
        must_failures := must_failures + 1;
    ELSE
        RAISE NOTICE '[MUST PASS] All SECURITY DEFINER functions have search_path';
    END IF;
    
    -- MUST: Critical tables have DELETE policies
    SELECT COUNT(*) INTO missing_delete_policy
    FROM (VALUES ('ceo_requests'), ('ceo_users'), ('ceo_organizations')) AS t(tablename)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.schemaname = 'public' 
          AND p.tablename = t.tablename 
          AND p.cmd IN ('DELETE', 'ALL')
    );
    
    IF missing_delete_policy > 0 THEN
        RAISE WARNING '[MUST FAIL] % critical tables missing DELETE policy', missing_delete_policy;
        must_failures := must_failures + 1;
    ELSE
        RAISE NOTICE '[MUST PASS] Critical tables have DELETE policies';
    END IF;
    
    -- Final summary
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    IF must_failures = 0 THEN
        RAISE NOTICE '✅ ALL MUST CHECKS PASSED';
    ELSE
        RAISE WARNING '❌ % MUST CHECK(S) FAILED', must_failures;
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

\echo ''

-- ============================================================================
-- SECTION 8: STATISTICS SUMMARY
-- ============================================================================
\echo '┌──────────────────────────────────────────────────────────────────────┐'
\echo '│ SECTION 8: FINAL STATISTICS                                          │'
\echo '└──────────────────────────────────────────────────────────────────────┘'
\echo ''

SELECT 
    'CEO Tables' AS "Metric",
    COUNT(*)::text AS "Value"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'ceo_%'

UNION ALL

SELECT 
    'Tables with RLS',
    COUNT(*)::text
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'ceo_%' AND rowsecurity

UNION ALL

SELECT 
    'RLS Policies',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE 'ceo_%'

UNION ALL

SELECT 
    'SECURITY DEFINER Functions',
    COUNT(*)::text
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE nspname = 'public' AND prosecdef = true

UNION ALL

SELECT 
    'Active Triggers',
    COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth');

\echo ''
\echo '╔══════════════════════════════════════════════════════════════════════╗'
\echo '║                    SECURITY AUDIT COMPLETE                           ║'
\echo '╚══════════════════════════════════════════════════════════════════════╝'
\echo ''
