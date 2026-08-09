# Connexion à PostgreSQL avec SQLAlchemy

## Le code

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

DATABASE_URL = (
    f"postgresql+psycopg://"
    f"{settings.DB_USER}:"
    f"{settings.DB_PASSWORD}@"
    f"{settings.DB_HOST}:"
    f"{settings.DB_PORT}/"
    f"{settings.DB_NAME}"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
```

---

# 1. Les imports

```python
from sqlalchemy import create_engine
```

## À quoi sert `create_engine` ?

`create_engine()` crée un **Engine SQLAlchemy**.

L'Engine est le composant chargé de communiquer avec la base de données.

Il connaît :

- le type de base de données
- l'adresse du serveur
- le port
- l'utilisateur
- le mot de passe
- le pilote (driver) à utiliser

On peut le voir comme un **moteur de connexion**.

---

```python
from sqlalchemy.orm import sessionmaker
```

## À quoi sert `sessionmaker` ?

`sessionmaker` est une **fabrique de sessions**.

Une session permet d'effectuer des opérations sur la base de données :

- Lire (`SELECT`)
- Ajouter (`INSERT`)
- Modifier (`UPDATE`)
- Supprimer (`DELETE`)

Sans session, il est impossible d'interagir avec la base.

---

```python
from app.core.config import settings
```

## Pourquoi importer `settings` ?

`settings` contient les informations provenant du fichier `.env`.

Exemple :

```env
DB_USER=postgres
DB_PASSWORD=1234
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fastapi_db
```

Ainsi :

```python
settings.DB_USER
```

renvoie

```
postgres
```

---

# 2. Construction de l'URL de connexion

```python
DATABASE_URL = (
    f"postgresql+psycopg://"
    f"{settings.DB_USER}:"
    f"{settings.DB_PASSWORD}@"
    f"{settings.DB_HOST}:"
    f"{settings.DB_PORT}/"
    f"{settings.DB_NAME}"
)
```

Cette partie construit une chaîne de caractères.

Si le fichier `.env` contient :

```env
DB_USER=postgres
DB_PASSWORD=1234
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fastapi_db
```

alors `DATABASE_URL` devient :

```
postgresql+psycopg://postgres:1234@localhost:5432/fastapi_db
```

Cette URL indique à SQLAlchemy :

- quelle base utiliser
- où elle se trouve
- comment s'y connecter

---

# 3. Que signifie `postgresql+psycopg` ?

Cette partie est composée de deux éléments.

```
postgresql + psycopg
```

## `postgresql`

Indique le type de base de données.

Ici :

```
PostgreSQL
```

---

## `psycopg`

`psycopg` est un **driver** (pilote).

Son rôle est de traduire les requêtes Python en requêtes compréhensibles par PostgreSQL.

On peut représenter cela ainsi :

```
Python
   │
   ▼
SQLAlchemy
   │
   ▼
psycopg
   │
   ▼
PostgreSQL
```

Sans `psycopg`, Python ne sait pas communiquer avec PostgreSQL.

> **Remarque :**
>
> - `psycopg` = Psycopg 3 (version moderne)
> - `psycopg2` = ancienne version encore très utilisée

---

# 4. Création du moteur

```python
engine = create_engine(DATABASE_URL)
```

Cette instruction crée le moteur SQLAlchemy.

Le moteur mémorise :

- le type de base
- l'adresse
- le port
- les identifiants
- le driver

Toutes les connexions passeront ensuite par ce moteur.

Schéma :

```
Application
      │
      ▼
Engine SQLAlchemy
      │
      ▼
psycopg
      │
      ▼
PostgreSQL
```

---

# 5. Création de la fabrique de sessions

```python
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
```

`SessionLocal` est une **fabrique**.

Elle permettra plus tard de créer des sessions.

Exemple :

```python
db = SessionLocal()
```

Chaque appel crée une nouvelle session connectée à PostgreSQL.

---

# 6. Le paramètre `autocommit=False`

```python
autocommit=False
```

Les modifications ne sont **pas enregistrées automatiquement**.

Il faut appeler :

```python
db.commit()
```

Exemple :

```python
db.add(user)
db.commit()
```

Sans `commit()`, les données ne seront pas sauvegardées.

---

# 7. Le paramètre `autoflush=False`

```python
autoflush=False
```

SQLAlchemy peut envoyer automatiquement les modifications vers la base.

Avec `False`, il attend que tu le décides.

Cela donne plus de contrôle sur le moment où les requêtes sont envoyées.

---

# 8. Le paramètre `bind=engine`

```python
bind=engine
```

Toutes les sessions créées utiliseront cet Engine.

Schéma :

```
SessionLocal
      │
      ▼
Engine
      │
      ▼
PostgreSQL
```

---

# 9. Comment tout fonctionne ensemble ?

```
           .env
             │
             ▼
         settings
             │
             ▼
      DATABASE_URL
             │
             ▼
     create_engine()
             │
             ▼
           Engine
             │
             ▼
      sessionmaker()
             │
             ▼
       SessionLocal
             │
             ▼
      Session PostgreSQL
```

---

# 10. Exemple d'utilisation

Créer une session :

```python
db = SessionLocal()
```

Lire des données :

```python
users = db.query(User).all()
```

Ajouter une donnée :

```python
db.add(user)
db.commit()
```

Fermer la session :

```python
db.close()
```

---

# Résumé

| Élément | Rôle |
|----------|------|
| `settings` | Lit les informations du fichier `.env` |
| `DATABASE_URL` | Construit l'adresse de connexion à PostgreSQL |
| `psycopg` | Driver permettant à Python de communiquer avec PostgreSQL |
| `create_engine()` | Crée le moteur de connexion |
| `engine` | Gère la connexion à la base de données |
| `sessionmaker()` | Crée une fabrique de sessions |
| `SessionLocal()` | Ouvre une session vers la base |
| `db.commit()` | Enregistre les modifications |
| `db.close()` | Ferme la connexion |