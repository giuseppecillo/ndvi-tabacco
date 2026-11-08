// Fixed, authorized metadata only. No logging setters or credential operations.
export const LOGGING_QUERIES = Object.freeze({
  permissions: `WITH requested(name) AS (
    VALUES ('log_statement'), ('log_min_error_statement'), ('log_min_messages'),
      ('pg_stat_statements.track'), ('pgaudit.log')
  )
  SELECT name, pg_catalog.current_setting(name, true) AS current_value,
    CASE WHEN pg_catalog.current_setting(name, true) IS NOT NULL
      THEN pg_catalog.has_parameter_privilege(current_user, name, 'SET')
      ELSE NULL END AS can_set
  FROM requested ORDER BY name`,
  extensions: `SELECT extname FROM pg_catalog.pg_extension
    WHERE extname IN ('pg_stat_statements','pgaudit') ORDER BY extname`,
});
