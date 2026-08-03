# On importe BaseSettings qui permet de créer une classe
# capable de lire automatiquement les variables d'environnement.
#
# On importe aussi SettingsConfigDict qui sert à configurer
# le comportement de BaseSettings.
from pydantic_settings import BaseSettings, SettingsConfigDict


# On crée une classe Settings qui hérite de BaseSettings.
#
# Grâce à cet héritage, cette classe va automatiquement
# aller chercher les valeurs dans le fichier .env.
class Settings(BaseSettings):

    # Variable attendue dans le .env
    # Exemple :
    # DB_NAME=mydatabase
    DB_NAME: str

    # Nom d'utilisateur de la base de données
    # Exemple :
    # DB_USER=postgres
    DB_USER: str

    # Mot de passe de la base de données
    # Exemple :
    # DB_PASSWORD=123456
    DB_PASSWORD: str

    # Adresse du serveur de base de données
    # Exemple :
    # DB_HOST=localhost
    DB_HOST: str

    # Port de connexion
    # Exemple :
    # DB_PORT=5432
    DB_PORT: int

    # Clé secrète utilisée pour signer les JWT
    SECRET_KEY: str

    # Algorithme utilisé pour signer le token
    # Exemple :
    # ALGORITHM=HS256
    ALGORITHM: str

    # Durée de vie du token en minutes
    # Exemple :
    # ACCESS_TOKEN_EXPIRE_MINUTES=30
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Configuration de BaseSettings.
    #
    # Ici on indique où trouver les variables d'environnement.
    model_config = SettingsConfigDict(

        # Nom du fichier contenant les variables.
        env_file=".env",

        # Encodage du fichier.
        env_file_encoding="utf-8"
    )


# Création d'une instance de Settings.
#
# C'est ici que Pydantic va :
#
# 1. Ouvrir le fichier .env
# 2. Lire chaque variable
# 3. Vérifier son type (str, int...)
# 4. Les stocker dans l'objet settings
#
# Si une variable manque ou si son type est incorrect,
# une erreur sera levée immédiatement.
settings = Settings()