---
name: security-hardener
description: Auditer et renforcer la sécurité d'un projet logiciel, puis corriger les vulnérabilités confirmées avec des changements ciblés et vérifiés. Utiliser pour les demandes telles que « vérifie la sécurité », « recherche et corrige les failles », « fais un audit de sécurité complet » ou « sécurise le backend, le frontend et la production ».
---

# Security Hardener

## Objectif

Examiner le projet de bout en bout, classer les constats de `INFO` à `CRITICAL`, corriger les vulnérabilités confirmées qui peuvent l'être sans danger et vérifier les corrections.

Ne jamais garantir l'absence absolue de faille. Décrire précisément le périmètre contrôlé, les contrôles non exécutés et les risques résiduels.

## Contexte à inspecter

Avant toute modification :

1. Lire les instructions du dépôt, le README et la documentation de déploiement.
2. Examiner l'arborescence, les dépendances, les configurations et les changements Git existants.
3. Repérer les points d'entrée, frontières de confiance, données sensibles et services externes.
4. Examiner les tests de sécurité existants avant d'en ajouter.
5. Préserver les modifications de l'utilisateur et ignorer les changements sans rapport avec l'audit.

Pour ce dépôt, couvrir au minimum :

- FastAPI, Pydantic, SQLAlchemy, PostgreSQL et Alembic ;
- authentification, JWT, mots de passe, cookies, sessions, CSRF et CORS ;
- autorisations et isolation des données entre sociétés ;
- React/Vite, XSS, navigation et stockage des jetons ;
- variables d'environnement, secrets, logs, SMTP et intégration OpenAI ;
- configuration HTTPS, proxy, hôtes autorisés, sauvegardes et démarrage de production ;
- dépendances Python et npm.

## Workflow

1. Définir le périmètre de l'audit à partir de la demande et du dépôt.
2. Construire un modèle de menace léger : actifs, acteurs, entrées, frontières de confiance et impacts.
3. Rechercher les secrets suivis par Git, valeurs sensibles codées en dur, journaux indiscrets et fichiers exclus incorrectement.
4. Examiner les mécanismes d'authentification, de renouvellement, de révocation, de récupération et de changement de mot de passe.
5. Vérifier les autorisations sur chaque route et chaque accès aux données, notamment l'isolation multi-tenant.
6. Rechercher injections SQL/commande/template, XSS, CSRF, SSRF, traversée de chemin, redirections ouvertes, désérialisation dangereuse et validation insuffisante.
7. Examiner CORS, cookies, en-têtes, hôtes autorisés, HTTPS, proxy, limites de requêtes et messages d'erreur.
8. Examiner les migrations, sauvegardes, permissions de base et paramètres de production.
9. Auditer les dépendances avec les outils déjà disponibles. Demander l'autorisation avant d'installer un scanner ou d'accéder à un service externe.
10. Confirmer chaque constat à partir du code, d'un test, d'une configuration ou d'une sortie d'outil. Écarter explicitement les faux positifs.
11. Attribuer une sévérité, expliquer l'impact, la condition d'exploitation et la preuve.
12. Corriger d'abord les constats confirmés les plus graves, par le plus petit changement cohérent.
13. Ajouter ou adapter un test de non-régression lorsque la vulnérabilité peut être testée de façon déterministe.
14. Exécuter les tests ciblés, puis les validations plus larges justifiées par les fichiers modifiés.
15. Relire le diff final pour détecter secrets, code de débogage, régressions, dépendances inutiles et modifications hors périmètre.
16. Produire le rapport final, y compris les constats non corrigés et les limites de l'audit.

## Classement des constats

Utiliser les niveaux suivants :

- `CRITICAL` : compromission directe, exécution de code, contournement global d'authentification, fuite massive ou destruction plausible de données.
- `HIGH` : accès non autorisé important, élévation de privilèges, fuite sensible ou exploitation réaliste avec impact majeur.
- `MEDIUM` : exploitation conditionnelle ou impact limité nécessitant plusieurs préconditions.
- `LOW` : faiblesse réelle à impact réduit ou difficilement exploitable.
- `INFO` : amélioration défensive sans vulnérabilité exploitable démontrée.

Ne pas gonfler la sévérité. Si elle reste incertaine, donner le niveau retenu et expliquer l'incertitude.

## Politique de correction

Corriger directement les changements locaux, ciblés et réversibles qui respectent l'architecture existante.

Demander une confirmation avant :

- toute suppression ou migration destructive de données ;
- toute modification incompatible d'une API publique ;
- toute rotation ou révocation réelle de secret ;
- toute action sur un environnement distant ou de production ;
- toute mise à niveau majeure de dépendance ;
- toute installation d'un outil ou d'une dépendance ;
- toute refonte étendue qui dépasse une correction de sécurité ciblée.

Ne jamais :

- afficher, copier ou committer un secret réel ;
- affaiblir un contrôle pour faire passer un test ;
- supprimer un test de sécurité sans justification explicite ;
- modifier des fichiers sans rapport avec un constat ;
- exploiter un système distant ou effectuer un test intrusif sans autorisation explicite ;
- déclarer un test réussi sans l'avoir exécuté ;
- présenter une hypothèse ou la sortie brute d'un scanner comme une faille confirmée.

## Validation

Choisir les contrôles disponibles et proportionnés aux changements :

1. Tests ciblés dans `tests/`, notamment les tests d'authentification, de production et de sécurité.
2. Suite `pytest` lorsque sa durée et l'environnement le permettent.
3. Lint et build du frontend avec les scripts définis dans `frontend-react/package.json`.
4. Vérification des imports, du démarrage et de la configuration de production pour les changements backend.
5. Validation Alembic pour toute modification de schéma.
6. Audit des dépendances avec les outils déjà installés.

Lorsqu'un contrôle ne peut pas être exécuté, indiquer la commande concernée, la raison et la conséquence sur le niveau de confiance.

## Format de sortie

Présenter les constats dans l'ordre décroissant de sévérité :

```markdown
## Résultat

### [SEVERITY] Titre
- Emplacement : `chemin:ligne`
- Preuve : comportement ou code observé
- Impact : conséquence réaliste
- Correction : modification appliquée ou recommandée
- Validation : test ou commande et résultat

## Corrections appliquées
- `chemin` — résumé

## Risques résiduels
- constat non corrigé, raison et prochaine action

## Couverture et limites
- zones contrôlées
- outils exécutés
- contrôles non exécutés
```

S'il n'existe aucun constat confirmé, le dire sans affirmer que le projet est exempt de vulnérabilités.
