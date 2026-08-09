from pathlib import Path

# Dossier dans lequel créer les fichiers
folder = Path("src/components/UI")

# Crée le dossier ainsi que les dossiers parents s'ils n'existent pas
folder.mkdir(parents=True, exist_ok=True)

# Liste des fichiers à créer
files = [
    "Dashboard.tsx",
    "StatCards.tsx",
    "RevenueChart.tsx",
    "RecentActivity.tsx",
    "RecentClients.tsx",
]

# Création des fichiers
for file in files:
    (folder / file).touch()

print(f"{len(files)} fichiers créés dans {folder}")