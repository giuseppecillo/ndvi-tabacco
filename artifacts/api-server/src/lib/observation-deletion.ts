/** Server clock only. NULL/unknown and future creation times are not eligible. */
export const RECENT_OBSERVATION_SQL = `
  created_at IS NOT NULL
  AND created_at <= statement_timestamp()
  AND created_at >= statement_timestamp() - interval '24 hours'
`;
