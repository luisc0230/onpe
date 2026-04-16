-- Eliminar snapshots duplicados donde los votos no cambiaron
-- Mantener solo el snapshot más antiguo de cada grupo de votos idénticos por candidato

WITH ranked_snapshots AS (
  SELECT 
    id,
    dni,
    votes,
    upstream_ts_ms,
    captured_at,
    ROW_NUMBER() OVER (
      PARTITION BY dni, votes 
      ORDER BY captured_at ASC
    ) as rn
  FROM candidate_snapshots
)
DELETE FROM candidate_snapshots
WHERE id IN (
  SELECT id 
  FROM ranked_snapshots 
  WHERE rn > 1
);

-- Verificar cuántos snapshots quedan por candidato
SELECT 
  dni,
  name,
  COUNT(*) as snapshot_count,
  MIN(captured_at) as first_snapshot,
  MAX(captured_at) as last_snapshot
FROM candidate_snapshots
GROUP BY dni, name
ORDER BY snapshot_count DESC;
