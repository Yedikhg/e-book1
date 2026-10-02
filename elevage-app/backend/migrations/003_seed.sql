-- Migration 003 : données initiales
-- Un utilisateur administrateur par défaut (PIN : 0000, à changer).
-- Le pin_hash ici est bcrypt de "0000".
INSERT INTO utilisateurs (nom, pin_hash)
VALUES ('Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LjZdGiu6Yum');

-- Quelques propriétaires de démonstration
INSERT INTO proprietaires (nom) VALUES ('Maman'), ('Les frères');
