-- Répare uniquement le PIN initial documenté de la démonstration.
-- Préserve les PIN déjà changés par un utilisateur.
UPDATE utilisateurs
SET pin_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMye/IU4EXLax8duk97FfN6lfrx4/Qs87vC'
WHERE nom = 'Admin'
  AND pin_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LjZdGiu6Yum';
