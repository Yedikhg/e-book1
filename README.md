# Application de gestion d’élevage

Le code de l’application se trouve dans le dossier **[`elevage-app/`](./elevage-app/)**. Ouvre ce dossier pour accéder au frontend, à l’API Go, aux migrations PostgreSQL et aux scripts du projet.

## À quoi sert l’application ?

Cette application web aide à suivre l’activité d’un élevage : arrivages, lots, ventes, paiements et mortalités. Elle comprend une interface React, une API écrite en Go et une base PostgreSQL.

## Accès direct aux fichiers

- [Tout le code de l’application](./elevage-app/)
- [Commandes du projet — Makefile](./elevage-app/Makefile)
- [Exemple de configuration — .env.example](./elevage-app/.env.example)
- [Interface web — frontend](./elevage-app/frontend/)
- [Écran « Aujourd’hui »](./elevage-app/frontend/src/pages/Aujourd_hui.jsx)
- [Saisie d’un nouvel arrivage](./elevage-app/frontend/src/pages/NouvelArrivage.jsx)
- [Saisie des ventes](./elevage-app/frontend/src/pages/EnregistrerVente.jsx)
- [Saisie des paiements](./elevage-app/frontend/src/pages/EnregistrerPaiement.jsx)
- [Saisie des mortalités](./elevage-app/frontend/src/pages/SaisieMortalite.jsx)
- [API Go](./elevage-app/backend/)
- [Point de démarrage de l’API](./elevage-app/backend/cmd/api/main.go)
- [Gestion des routes HTTP](./elevage-app/backend/internal/http/)
- [Schéma initial de la base de données](./elevage-app/backend/migrations/001_schema.sql)
- [Tests du backend](./elevage-app/backend/tests/)

## Organisation du projet

```text
elevage-app/
├── backend/
│   ├── cmd/api/                 Démarrage de l’API Go
│   ├── internal/http/           Routes et gestion des requêtes
│   ├── internal/service/        Règles métier
│   ├── internal/store/          Accès aux données
│   ├── migrations/              Schéma, vues et données initiales
│   └── tests/                   Tests Go
├── frontend/
│   └── src/
│       ├── components/          Composants réutilisables
│       ├── hooks/               Connexion aux données
│       ├── pages/               Écrans de l’application
│       └── utils/               Fonctions utilitaires et API
├── scripts/                     Sauvegarde et retour arrière
├── .env.example                 Exemple de variables locales
└── Makefile                     Commandes de développement
```

## Technologies

- **Interface :** React 18 et Vite
- **API :** Go et HTTP
- **Base de données :** PostgreSQL

## Lancer le projet en local

Depuis le dossier du dépôt, initialise d’abord la base PostgreSQL. Remplace les valeurs d’exemple par celles de ta base :

```bash
cd elevage-app
make migrate DB_URL="postgres://UTILISATEUR:MOT_DE_PASSE@HOTE:5432/BASE?sslmode=require"
```

Dans un premier terminal, démarre l’API :

```bash
cd elevage-app/backend
DATABASE_URL="postgres://UTILISATEUR:MOT_DE_PASSE@HOTE:5432/BASE?sslmode=require" go run ./cmd/api/main.go
```

Dans un second terminal, démarre l’interface :

```bash
cd elevage-app/frontend
npm install
npm run dev
```

Le fichier Vite configure déjà le relais des appels `/api` vers l’API locale sur le port 8080. Consulte le [Makefile](./elevage-app/Makefile) et le fichier [`.env.example`](./elevage-app/.env.example) pour les paramètres disponibles.

## État du projet et sécurité

Le dépôt contient le code source de l’application; cela ne signifie pas encore que l’application est déployée. Le contrôle d’utilisateur actuel repose sur l’en-tête `X-User-ID` et une valeur de test par défaut. **N’utilise pas cette version avec des données réelles ou confidentielles avant d’ajouter une authentification et des contrôles d’accès adaptés.**

Ne publie jamais de vrais mots de passe ou clés dans GitHub.
