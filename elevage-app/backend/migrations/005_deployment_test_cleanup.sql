-- Remove only unreferenced duplicate fixtures created by the deployment UI test.
-- Keep the first test client and every client referenced by a sale.
DELETE FROM clients c
WHERE c.id BETWEEN 2 AND 16
  AND c.nom IN ('TEST déploiement 04-10-2026', 'TEST deploiement 04-10-2026')
  AND c.cree_le >= TIMESTAMPTZ '2026-10-04 05:52:00+00'
  AND c.cree_le < TIMESTAMPTZ '2026-10-04 05:58:00+00'
  AND NOT EXISTS (SELECT 1 FROM ventes v WHERE v.client_id = c.id);
