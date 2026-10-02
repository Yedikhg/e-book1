-- Migration 002 : vues calculées
-- Ces vues ne stockent rien — elles recalculent à chaque appel.
-- Un chiffre recalculable ne se stocke jamais.

-- Effectif courant d'un arrivage : bêtes initiales moins les mouvements valides.
-- Un mouvement est exclu s'il est annulé (quelqu'un référence son id dans annule_id)
-- ou s'il est lui-même une annulation (annule_id IS NOT NULL).
CREATE OR REPLACE VIEW effectif_courant AS
SELECT
    a.id AS arrivage_id,
    a.effectif_initial,
    a.effectif_initial - COALESCE(SUM(m.nombre), 0) AS vivantes
FROM arrivages a
LEFT JOIN mouvements m ON m.arrivage_id = a.id
    AND m.annule_id IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM mouvements c WHERE c.annule_id = m.id
    )
GROUP BY a.id, a.effectif_initial;

-- Coût total investi dans un arrivage (achat + dépenses).
CREATE OR REPLACE VIEW cout_total_arrivage AS
SELECT
    a.id AS arrivage_id,
    a.effectif_initial * a.prix_unitaire_cts AS cout_achat_cts,
    COALESCE(SUM(d.montant_cts), 0) AS cout_depenses_cts,
    a.effectif_initial * a.prix_unitaire_cts + COALESCE(SUM(d.montant_cts), 0) AS cout_total_cts
FROM arrivages a
LEFT JOIN depenses d ON d.arrivage_id = a.id
GROUP BY a.id, a.effectif_initial, a.prix_unitaire_cts;

-- Reste à payer sur chaque vente : total moins les paiements confirmés.
CREATE OR REPLACE VIEW reste_a_payer AS
SELECT
    v.id AS vente_id,
    v.mouvement_id,
    v.client_id,
    v.total_cts,
    COALESCE(SUM(p.montant_cts) FILTER (WHERE p.statut = 'confirme'), 0) AS paye_cts,
    v.total_cts - COALESCE(SUM(p.montant_cts) FILTER (WHERE p.statut = 'confirme'), 0) AS reste_cts
FROM ventes v
LEFT JOIN paiements p ON p.vente_id = v.id
GROUP BY v.id, v.mouvement_id, v.client_id, v.total_cts;

-- Répartition des bêtes vivantes par propriétaire, pour un arrivage.
-- Le prorata utilise FLOOR ; le reste d'arrondi est assigné au plus grand propriétaire
-- dans le code Go (pas en SQL, car SQL ne peut pas trier et distribuer atomiquement).
CREATE OR REPLACE VIEW repartition_par_part AS
WITH vivantes AS (
    SELECT arrivage_id, vivantes
    FROM effectif_courant
)
SELECT
    p.arrivage_id,
    p.proprietaire_id,
    pr.nom AS proprietaire_nom,
    p.effectif_initial AS part_initiale,
    a.effectif_initial AS total_initial,
    v.vivantes AS total_vivantes,
    FLOOR(p.effectif_initial::numeric / a.effectif_initial * v.vivantes)::integer AS vivantes_part
FROM parts p
JOIN arrivages a ON a.id = p.arrivage_id
JOIN proprietaires pr ON pr.id = p.proprietaire_id
JOIN vivantes v ON v.arrivage_id = a.id;
