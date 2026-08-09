# Classe `Base` avec SQLAlchemy

## Le code

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

---

# 1. L'import

```python
from sqlalchemy.orm import DeclarativeBase
```

On importe `DeclarativeBase` depuis SQLAlchemy.

`DeclarativeBase` est une classe fournie par SQLAlchemy qui sert à créer une **classe de base** pour tous les modèles de la base de données.

Autrement dit, tous les modèles (`User`, `Product`, `Article`, etc.) hériteront de cette classe.

---

# 2. Création de la classe Base

```python
class Base(DeclarativeBase):
    pass
```

Ici, on crée notre propre classe `Base`.

Elle hérite de `DeclarativeBase`.

Le mot-clé `pass` signifie :

> "Cette classe n'a rien de particulier à faire pour le moment."

On crée simplement une classe vide qui servira de parent à tous les modèles.

---

# Pourquoi créer cette classe ?

Imagine une base de données contenant plusieurs tables.

Par exemple :

- users
- products
- orders
- categories

En SQLAlchemy, chaque table est représentée par une classe Python.

Exemple :

```python
class User(Base):
    ...
```

```python
class Product(Base):
    ...
```

```python
class Order(Base):
    ...
```

Toutes ces classes héritent de `Base`.

```
            DeclarativeBase
                    │
                    ▼
                 Base
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        User     Product    Order
```

Grâce à cet héritage, SQLAlchemy comprend que ces classes représentent des tables.

---

# Que fait réellement `DeclarativeBase` ?

Lorsque tu écris :

```python
class User(Base):
    __tablename__ = "users"
```

SQLAlchemy :

- enregistre automatiquement la classe ;
- comprend qu'elle correspond à une table ;
- mémorise les colonnes définies dans la classe ;
- pourra ensuite créer cette table dans PostgreSQL.

Sans `DeclarativeBase`, SQLAlchemy ne saurait pas que `User` est un modèle de base de données.

---

# Exemple complet

```python
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class User(Base):

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    username: Mapped[str] = mapped_column(String)
```

SQLAlchemy comprend alors qu'il faut créer une table :

```sql
users

id          INTEGER PRIMARY KEY
username    VARCHAR
```

---

# À quoi sert ensuite `Base` ?

Plus tard, on peut créer toutes les tables avec une seule instruction :

```python
Base.metadata.create_all(bind=engine)
```

Cette ligne signifie :

1. Parcourir toutes les classes qui héritent de `Base`.
2. Les transformer en tables SQL.
3. Les créer dans PostgreSQL si elles n'existent pas.

Par exemple, si tu as :

```python
class User(Base):
    ...
```

```python
class Product(Base):
    ...
```

```python
class Order(Base):
    ...
```

Alors :

```python
Base.metadata.create_all(bind=engine)
```

créera automatiquement :

- users
- products
- orders

---

# Pourquoi utiliser une classe de base ?

Sans `Base`, il faudrait enregistrer chaque modèle manuellement.

Avec `Base`, SQLAlchemy garde une liste de tous les modèles.

```
                Base
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
    User      Product     Order
                 │
                 ▼
     Base.metadata connaît
     tous les modèles
```

---

# Résumé

| Élément | Rôle |
|---------|------|
| `DeclarativeBase` | Classe fournie par SQLAlchemy pour créer une base commune aux modèles. |
| `Base` | Classe de base dont hériteront tous les modèles de l'application. |
| `pass` | La classe est vide, elle sert uniquement de parent. |
| `Base.metadata` | Contient les informations de tous les modèles héritant de `Base`. |
| `Base.metadata.create_all(engine)` | Crée automatiquement toutes les tables dans la base de données. |

---

# En une phrase

`Base` est la **classe mère** de tous tes modèles SQLAlchemy. Grâce à elle, SQLAlchemy sait quelles classes représentent des tables et peut les créer automatiquement dans la base de données.