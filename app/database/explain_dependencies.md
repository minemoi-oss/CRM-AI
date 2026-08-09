Ce code est très utilisé avec **FastAPI**. Son rôle est de **fournir une connexion à la base de données** à chaque requête, puis de la fermer automatiquement.

Voyons-le ligne par ligne.

---

```python
from .session import SessionLocal
```

On importe `SessionLocal`.

On l'avait créé précédemment avec :

```python
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
```

Rappelle-toi que **`SessionLocal` est une fabrique de sessions**.

À chaque fois qu'on l'appelle :

```python
db = SessionLocal()
```

une **nouvelle session** est créée.

Tu peux voir ça comme une nouvelle connexion à la base de données.

---

```python
def get_db():
```

On crée une fonction appelée `get_db`.

Son rôle est simple :

> Donner une session de base de données à celui qui en a besoin.

---

```python
db = SessionLocal()
```

Ici, on crée une nouvelle session.

À partir de maintenant, `db` permet de communiquer avec PostgreSQL.

Par exemple :

```python
users = db.query(User).all()
```

ou

```python
db.add(user)
db.commit()
```

Toutes ces opérations utilisent cette session.

---

```python
try:
```

Le bloc `try` signifie :

> "Exécute le code suivant, mais quoi qu'il arrive, on fera aussi ce qui est dans `finally`."

Pourquoi ?

Parce qu'une connexion à la base de données doit toujours être fermée, même si une erreur se produit.

---

```python
yield db
```

C'est probablement la ligne la plus importante.

Tu connais peut-être déjà `return`.

Par exemple :

```python
def addition():
    return 5
```

Quand on appelle :

```python
addition()
```

on obtient `5` et la fonction est terminée.

---

`yield` fonctionne différemment.

Il dit :

> "Je te donne cette valeur, mais je garde la fonction en pause."

Autrement dit :

1. `db` est envoyé à FastAPI.
2. FastAPI utilise cette session.
3. Une fois la requête terminée, la fonction reprend juste après le `yield`.

C'est précisément ce qui permet d'exécuter le `finally`.

---

```python
finally:
```

Le bloc `finally` est exécuté **dans tous les cas** :

* si tout s'est bien passé ;
* s'il y a eu une erreur ;
* même si une exception est levée.

C'est idéal pour le nettoyage.

---

```python
db.close()
```

Cette ligne ferme la session.

Pourquoi est-ce important ?

Imagine que 1 000 utilisateurs utilisent ton API.

Si tu ouvres une connexion à chaque requête sans jamais la fermer :

```
Connexion 1
Connexion 2
Connexion 3
Connexion 4
...
Connexion 1000
```

Au bout d'un moment, PostgreSQL refusera de nouvelles connexions.

Avec `db.close()`, dès qu'une requête est terminée :

```
Ouverture de la connexion
        ↓
Traitement de la requête
        ↓
Fermeture de la connexion
```

Les ressources sont libérées correctement.

---

## Comment FastAPI utilise cette fonction ?

Supposons une route :

```python
from fastapi import Depends

@app.get("/users")
def get_users(db = Depends(get_db)):
    return db.query(User).all()
```

Voici ce qui se passe en coulisses :

### Étape 1

FastAPI appelle :

```python
get_db()
```

---

### Étape 2

La fonction crée une session :

```python
db = SessionLocal()
```

---

### Étape 3

Elle exécute :

```python
yield db
```

FastAPI récupère cette session et la donne à la variable `db` de la route.

La route peut alors faire :

```python
db.query(User).all()
```

---

### Étape 4

Quand la route a terminé son travail, FastAPI revient dans `get_db()`.

Le code reprend après le `yield`.

Il arrive alors au bloc :

```python
finally:
    db.close()
```

La connexion est fermée automatiquement.

---

### Schéma du déroulement

```
Un utilisateur appelle une route
            │
            ▼
FastAPI appelle get_db()
            │
            ▼
db = SessionLocal()
            │
            ▼
yield db
            │
            ▼
La route utilise la base de données
            │
            ▼
La route se termine
            │
            ▼
Retour dans get_db()
            │
            ▼
db.close()
            │
            ▼
Connexion fermée
```

### Pourquoi utiliser `yield` plutôt que `return` ?

Si tu écrivais :

```python
def get_db():
    db = SessionLocal()
    return db
```

la fonction se terminerait immédiatement après `return`.

Le code suivant ne serait jamais exécuté :

```python
db.close()
```

La session resterait ouverte.

Avec `yield`, FastAPI peut **utiliser la session pendant le traitement de la requête**, puis reprendre la fonction pour exécuter le nettoyage (`db.close()`).

C'est pour cette raison que `yield` est la manière recommandée de gérer les sessions SQLAlchemy dans les dépendances FastAPI.
