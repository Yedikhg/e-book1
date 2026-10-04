-- Migration 003 : données initiales
-- Un utilisateur administrateur par défaut (PIN : 0000, à changer).
-- Le pin_hash ici est bcrypt de "0000".
INSERT INTO utilisateurs (nom, pin_hash)
VALUES ('Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye/IU4EXLax8duk97FfN6lfrx4/Qs87vC');

-- Quelques propriétaires de démonstration
INSERT INTO proprietaires (nom) VALUES ('Maman'), ('Les frères');
