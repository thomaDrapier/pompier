# Spécifications des écrans

> Fait foi pour l'interface (cahier des charges section 8). Décrit le fonctionnement de chaque écran (contenu, champs, actions, messages, navigation), pas son apparence (D-014). Rédigé dans le projet Claude, écran par écran, avant le développement de chaque écran.

| | |
|---|---|
| **Version** | 1.1 |
| **Date** | 14/11/2026 |
| **Écrans spécifiés** | Liste des activités, Saisie / modification (J1) |

## 1. Règles communes

- **Niveau de finition :** composants shadcn/ui par défaut, mise en page simple ; mobile first, utilisable à une main (D-014, section 5 du cahier des charges).
- **Formats :** dates en français (« ven. 26/06/2026 »), heures sur 24 h, fuseau Europe/Paris ; durées « 3 h 15 » ; montants « 15,50 € ».
- **Hors ligne :** message clair (bandeau existant) ; aucun enregistrement possible ; le formulaire en cours conserve sa saisie.
- **Confirmations :** boîte de dialogue de l'application (composant shadcn/ui), jamais une boîte de dialogue du navigateur.
- **En-tête :** bouton de déconnexion. L'e-mail de l'utilisateur n'est pas affiché.
- **Navigation :** un utilisateur non connecté qui ouvre une adresse protégée est renvoyé vers la connexion, puis vers l'adresse demandée après connexion. Après connexion, l'écran d'arrivée est la liste des activités. Le bouton « retour » du téléphone fonctionne entre les écrans.

## 2. Liste des activités — `/activites`

**Objectif :** consulter les activités d'un mois et leurs montants, et accéder à la saisie.

**Contenu :**
- **Période :** mois en cours par défaut ; boutons « mois précédent » et « mois suivant ». Une activité appartient au mois où elle commence (règle provisoire, D-015).
- **Filtre par nature :** « Toutes » par défaut, puis chaque nature.
- Le mois et le filtre affichés sont conservés par le bouton retour et au retour d'un autre écran.
- **Totaux du mois** (activités au statut « ok » uniquement, D-011) : montant total ; astreinte nette totale ; nombre d'activités par nature.
- **Bandeau d'anomalie**, s'il y en a au moins une : « N activité(s) non comptée(s) : taux manquant (x), chevauchement d'astreintes (y) ».
- Les totaux et le bandeau d'anomalie portent toujours sur le mois entier ; le filtre par nature ne s'applique qu'aux lignes.
- Les messages « Activité enregistrée » et « Activité supprimée » s'affichent en haut de la liste.
- **Une ligne par activité**, la plus récente en premier :
  - date, heure de début et heure de fin (avec la date de fin si elle diffère de la date de début) ;
  - nature ;
  - durée retenue ; pour une astreinte, détail « déclarée · déduite · nette » ;
  - montant, ou « — » si l'activité est en anomalie ;
  - étiquette « Taux manquant » ou « Chevauchement d'astreintes » le cas échéant.

**Actions :**
- Toucher une ligne : ouvre `/activites/:id` (modification).
- Bouton « Nouvelle activité », toujours visible et accessible au pouce : ouvre `/activites/nouvelle`.

**États :** chargement ; erreur de chargement (message et bouton « Réessayer ») ; mois vide (« Aucune activité ce mois-ci » et bouton de saisie).

## 3. Saisie / modification — `/activites/nouvelle` et `/activites/:id`

**Objectif :** enregistrer une activité en moins de 15 secondes.

**Champs :**

| Champ | Obligatoire | Valeur par défaut (création) |
|---|---|---|
| Nature | oui | nature de l'activité la plus récemment créée par l'utilisateur ; à défaut, la première nature active |
| Début (date et heure) | oui | maintenant, arrondi au quart d'heure le plus proche ; à égale distance, arrondi vers le haut |
| Fin (date et heure) | oui | date de fin préremplie avec la date de début, heure de fin vide |
| Note | non | vide, champ masqué derrière le lien « Ajouter une note » |

- Seules les natures actives sont proposées. En modification, la nature d'origine reste affichée même si elle a été archivée.
- Début et fin : chacun en deux champs natifs du téléphone, date et heure.
- **Fin au lendemain :** tant que l'utilisateur n'a pas modifié lui-même la date de fin, elle suit la date de début, et passe au lendemain si l'heure de fin saisie est inférieure ou égale à l'heure de début (astreinte de nuit). La durée en direct rend ce passage visible.
- En modification, les champs sont préremplis avec les valeurs de l'activité.
- **Durée en direct** sous les champs dès que début et fin sont renseignés (« Durée : 13 h 00 »), calculée sur les instants réels, donc juste au changement d'heure.

**Contrôles à l'enregistrement :**

| Cas | Comportement |
|---|---|
| Champ obligatoire vide | Bloquant : le champ concerné est signalé. |
| Fin ≤ début | Bloquant : « La fin doit être après le début. » |
| Astreinte qui chevauche une autre astreinte (D-010) | Bloquant : « Cette astreinte chevauche celle du [date, heures]. » Si l'autre astreinte n'est connue que par l'erreur de la base : « Cette astreinte chevauche une autre astreinte. » |
| Doublon exact (même début, fin et nature) | Avertissement : « Une activité identique existe déjà. » Choix : « Enregistrer quand même » / « Annuler ». |
| Chevauchement entre deux activités qui ne sont pas des astreintes | Avertissement : « Cette activité chevauche [nature, date, heures]. » Choix : « Enregistrer quand même » / « Annuler ». |

Le chevauchement d'une activité avec une astreinte est normal et ne déclenche aucun message.

- **Chevauchement avec plusieurs activités :** l'avertissement nomme la première par ordre de début, suivie de « et N autre(s) ».
- **Astreinte déjà en anomalie « chevauchement d'astreintes » :** l'enregistrement reste bloqué tant que le chevauchement subsiste ; la modification des horaires qui le supprime et la suppression restent possibles.
- **Activité introuvable** (adresse d'une activité supprimée ou inaccessible) : message « Activité introuvable » et bouton de retour à la liste.

**Actions :**
- **Enregistrer :** retour à la liste, sur le mois de l'activité, et message « Activité enregistrée ».
- **Annuler :** retour à la liste sans enregistrer.
- **Supprimer** (modification uniquement) : confirmation « Supprimer cette activité ? », puis retour à la liste et message « Activité supprimée ».
- **Erreur réseau ou serveur :** message ; la saisie est conservée.

## 4. Écrans existants (J0)

Connexion, mot de passe oublié, nouveau mot de passe : fonctionnement inchangé ; ils reçoivent chacun une adresse propre. Le lien de réinitialisation reçu par e-mail doit continuer à fonctionner.

## 5. Historique

| Version | Date | Modifications |
|---|---|---|
| 1.0 | 14/11/2026 | Première version : règles communes, liste des activités, saisie / modification (J1). |
| 1.1 | 14/11/2026 | Précisions issues du plan de l'étape 1.2b : en-tête, conservation du mois et du filtre, totaux non filtrés, messages, champs date et heure séparés, valeurs par défaut (nature, arrondi, fin au lendemain), chevauchements multiples, astreinte en anomalie, activité introuvable. |
