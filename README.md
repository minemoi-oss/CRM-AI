# Mine CRM AI

## Production sans Docker

Architecture recommandée pour la première mise en production :

- frontend React statique sur `https://app.votre-domaine` ;
- API FastAPI sur `https://api.votre-domaine` ;
- PostgreSQL managé, distinct de la base locale et accessible uniquement en SSL ;
- un seul worker backend tant que la mémoire courte du copilote reste en RAM ;
- certificats HTTPS et renouvellement gérés par l'hébergeur ;
- sauvegardes natives du fournisseur PostgreSQL, complétées si nécessaire par le script local.

### 1. Base PostgreSQL

Créer une nouvelle base managée et conserver son URL dans le secret `DATABASE_URL`. Elle doit utiliser `sslmode=require` au minimum. Ne jamais remplacer la base locale par cette URL dans le fichier `.env` de développement.

Avant le premier lancement du backend de production :

```bash
alembic upgrade head
```

La commande doit être exécutée une seule fois par déploiement, avant l'ouverture du nouveau backend au trafic.

### 2. Backend

Copier les noms de variables de `.env.production.example` dans le gestionnaire de secrets de l'hébergeur. Ne pas déposer un vrai fichier `.env.production` dans Git.

Commande de démarrage :

```bash
python scripts/start_production.py
```

Ce profil impose `APP_ENV=production`, écoute le port fourni par l'hébergeur et conserve exactement un worker.

Healthchecks :

- `/health/live` vérifie que le processus répond ;
- `/health/ready` vérifie également la connexion PostgreSQL.

### 3. Frontend

Définir `VITE_API_URL=https://api.votre-domaine` avant le build. Un exemple se trouve dans `frontend-react/.env.production.example`.

```bash
cd frontend-react
npm ci
npm run build
```

Publier ensuite uniquement le dossier `frontend-react/dist` sur l'hébergement statique.

### 4. Cookies et domaines

Pour deux sous-domaines comme `app.mine-crm.example` et `api.mine-crm.example` :

- `AUTH_COOKIE_DOMAIN` reste vide : le refresh token demeure limité au backend ;
- `AUTH_CSRF_COOKIE_DOMAIN=.mine-crm.example` : le frontend peut lire uniquement le cookie CSRF ;
- `AUTH_ALLOWED_ORIGINS` contient exactement l'URL HTTPS du frontend ;
- `BACKEND_TRUSTED_HOSTS` contient exactement le domaine de l'API.

Le backend refuse de démarrer en production si HTTPS, SSL PostgreSQL, SMTP, les domaines ou les secrets indispensables sont mal configurés.

### 5. Sauvegardes

Activer d'abord les sauvegardes automatiques et la rétention proposées par le fournisseur PostgreSQL. Vérifier qu'une restauration vers une base vide est possible.

Si le fournisseur ne propose pas de sauvegarde suffisante, planifier quotidiennement :

```bash
python scripts/backup_postgres.py
```

Le serveur doit disposer de `pg_dump`, de `BACKUP_DIRECTORY` sur un stockage persistant chiffré et de `BACKUP_RETENTION_DAYS`. Le script produit une archive PostgreSQL compressée et supprime uniquement ses propres archives arrivées à expiration.

Tester chaque mois une archive sur une base séparée et vide avec `pg_restore --exit-on-error --no-owner`. Ne jamais tester une restauration sur la base de production.

### 6. Contrôle avant ouverture

1. `alembic current` correspond à `alembic heads`.
2. `/health/live` et `/health/ready` répondent en HTTPS.
3. Inscription, vérification email, connexion, refresh et déconnexion fonctionnent depuis le vrai domaine.
4. Deux comptes de sociétés différentes ne voient jamais les données l'un de l'autre.
5. La création client, prospect, devis, facture, paiement et brouillon IA fonctionne.
6. Une sauvegarde a été restaurée avec succès dans une base de test.
