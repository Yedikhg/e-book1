-- Migration 001 : schéma initial
-- Tous les montants en centimes (integers), jamais de flottant.

CREATE TABLE utilisateurs (
    id        BIGSERIAL PRIMARY KEY,
    nom       TEXT NOT NULL,
    pin_hash  TEXT NOT NULL,
    cree_le   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE proprietaires (
    id      BIGSERIAL PRIMARY KEY,
    nom     TEXT NOT NULL UNIQUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
    id        BIGSERIAL PRIMARY KEY,
    nom       TEXT NOT NULL,
    telephone TEXT,
    cree_le   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un arrivage physique de bêtes, reçu à une date donnée.
-- Plusieurs propriétaires peuvent se partager un même arrivage.
CREATE TABLE arrivages (
    id               BIGSERIAL PRIMARY KEY,
    recu_le          DATE NOT NULL,
    effectif_initial INTEGER NOT NULL CHECK (effectif_initial > 0),
    prix_unitaire_cts BIGINT NOT NULL CHECK (prix_unitaire_cts >= 0),
    notes            TEXT,
    cree_le          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La part de chaque propriétaire dans un arrivage.
-- La somme des effectif_initial de toutes les parts d'un arrivage
-- doit égaler l'effectif_initial de l'arrivage.
CREATE TABLE parts (
    arrivage_id      BIGINT NOT NULL REFERENCES arrivages(id),
    proprietaire_id  BIGINT NOT NULL REFERENCES proprietaires(id),
    effectif_initial INTEGER NOT NULL CHECK (effectif_initial > 0),
    PRIMARY KEY (arrivage_id, proprietaire_id)
);

-- Journal immuable de tout ce qui fait sortir une bête.
-- Une erreur se corrige par un mouvement d'annulation (annule_id rempli),
-- jamais par un UPDATE.
CREATE TYPE mouvement_type AS ENUM (
    'mortalite', 'vente', 'don', 'consommation'
);

CREATE TABLE mouvements (
    id           BIGSERIAL PRIMARY KEY,
    arrivage_id  BIGINT NOT NULL REFERENCES arrivages(id),
    type         mouvement_type NOT NULL,
    survenu_le   DATE NOT NULL,
    nombre       INTEGER NOT NULL CHECK (nombre > 0),
    saisi_par    BIGINT NOT NULL REFERENCES utilisateurs(id),
    annule_id    BIGINT REFERENCES mouvements(id),
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un mouvement d'annulation ne peut pas s'annuler lui-même.
    CONSTRAINT annulation_coherente CHECK (annule_id != id)
);

-- Une vente : le nombre de bêtes, le prix négocié, le total en centimes.
-- Lié à un mouvement de type 'vente'.
CREATE TABLE ventes (
    id           BIGSERIAL PRIMARY KEY,
    mouvement_id BIGINT NOT NULL UNIQUE REFERENCES mouvements(id),
    client_id    BIGINT REFERENCES clients(id),
    nombre       INTEGER NOT NULL CHECK (nombre > 0),
    prix_unit_cts BIGINT NOT NULL CHECK (prix_unit_cts >= 0),
    total_cts    BIGINT NOT NULL CHECK (total_cts >= 0),
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dépenses rattachées à un arrivage (nourriture, médicaments, eau, etc.)
CREATE TABLE depenses (
    id           BIGSERIAL PRIMARY KEY,
    arrivage_id  BIGINT NOT NULL REFERENCES arrivages(id),
    libelle      TEXT NOT NULL,
    montant_cts  BIGINT NOT NULL CHECK (montant_cts > 0),
    engagee_le   DATE NOT NULL,
    saisi_par    BIGINT NOT NULL REFERENCES utilisateurs(id),
    cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paiements reçus sur une vente (une ligne par tranche, jamais de booléen "payé").
-- Le reste dû = total_cts - SUM(montant_cts) des paiements confirmés.
CREATE TYPE paiement_statut AS ENUM ('en_attente', 'confirme', 'rejete');

CREATE TABLE paiements (
    id          BIGSERIAL PRIMARY KEY,
    vente_id    BIGINT NOT NULL REFERENCES ventes(id),
    montant_cts BIGINT NOT NULL CHECK (montant_cts > 0),
    recu_le     DATE NOT NULL,
    statut      paiement_statut NOT NULL DEFAULT 'confirme',
    reference   TEXT,
    saisi_par   BIGINT NOT NULL REFERENCES utilisateurs(id),
    cree_le     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_mouvements_arrivage ON mouvements(arrivage_id);
CREATE INDEX idx_depenses_arrivage ON depenses(arrivage_id);
CREATE INDEX idx_ventes_mouvement ON ventes(mouvement_id);
CREATE INDEX idx_paiements_vente ON paiements(vente_id);
CREATE INDEX idx_parts_arrivage ON parts(arrivage_id);
