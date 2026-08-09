

```python
class User(Base):
```

Tu crées une classe Python appelée **User**.

Comme elle hérite de **Base**, SQLAlchemy comprend que cette classe représente une **table** dans la base de données.

Autrement dit :

```
Classe Python  →  Table SQL
User           →  users
```

---

```python
__tablename__ = "users"
```

Cette ligne indique le nom de la table dans PostgreSQL.

La table s'appellera :

```sql
users
```

Si tu avais écrit :

```python
__tablename__ = "clients"
```

La table se serait appelée `clients`.

---

```python
id: Mapped[int] = mapped_column(primary_key=True)
```

Cette ligne crée une colonne appelée **id**.

Décomposons-la.

### `id`

C'est le nom de la colonne.

---

### `Mapped[int]`

C'est une annotation de type introduite dans SQLAlchemy 2.0.

Elle indique que cette colonne contiendra des **entiers** (`int`).

On peut le lire comme :

> "L'attribut `id` est une colonne SQL contenant des entiers."

---

### `mapped_column(...)`

Cette fonction sert à créer une colonne dans la table.

Toutes les colonnes sont généralement définies avec `mapped_column()`.

---

### `primary_key=True`

Cela signifie que `id` est la **clé primaire**.

Une clé primaire sert à identifier chaque ligne de manière unique.

Exemple :

| id | username |
| -- | -------- |
| 1  | Alice    |
| 2  | Bob      |
| 3  | Charlie  |

Il ne peut jamais y avoir deux utilisateurs avec le même `id`.

---

```python
username: Mapped[str] = mapped_column(String(50))
```

Cette ligne crée une colonne appelée `username`.

`Mapped[str]` indique que la valeur est une chaîne de caractères.

`String(50)` signifie que la longueur maximale est de **50 caractères**.

Par exemple :

```
Abdoul
```

est valide.

En revanche :

```
Une chaîne de 200 caractères
```

dépasse la limite fixée.

---

```python
email: Mapped[str] = mapped_column(String(100))
```

Même principe.

Cette colonne stocke l'adresse e-mail.

La longueur maximale est de **100 caractères**.

Par exemple :

```
user@example.com
```

---

```python
hashed_password: Mapped[str] = mapped_column(String(255))
```

Cette colonne ne contient **pas le mot de passe en clair**.

Elle contient sa version **hachée** (chiffrée dans le sens du hachage).

Par exemple, si l'utilisateur choisit :

```
motdepasse123
```

Tu ne stockes jamais cela dans la base.

Tu stockes quelque chose comme :

```
$2b$12$0S4mP5...
```

Pourquoi ?

Parce que si quelqu'un vole la base de données, il ne pourra pas lire directement les mots de passe des utilisateurs.

Le `String(255)` laisse suffisamment de place pour ces chaînes de hachage.

---

```python
is_active: Mapped[bool] = mapped_column(default=True)
```

Cette colonne indique si le compte est actif.

Le type est un booléen (`True` ou `False`).

Le paramètre `default=True` signifie que si tu crées un utilisateur sans préciser cette valeur, SQLAlchemy mettra automatiquement :

```python
True
```

Autrement dit, tous les nouveaux comptes sont actifs par défaut.

---

### À quoi ressemble la table créée ?

Cette classe correspond approximativement à la table SQL suivante :

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    hashed_password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);
```

---

### Comment créer un utilisateur ?

Grâce à cette classe, tu peux écrire :

```python
user = User(
    username="Abdoul",
    email="user@example.com",
    hashed_password="mot_de_passe_haché"
)
```

Tu remarqueras que tu ne fournis pas `is_active`.

SQLAlchemy lui donnera automatiquement la valeur `True`.

Ensuite, tu peux enregistrer cet utilisateur dans la base :

```python
db.add(user)
db.commit()
```

À ce moment-là, une nouvelle ligne est créée dans la table `users`.
