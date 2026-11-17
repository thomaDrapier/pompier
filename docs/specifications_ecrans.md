# Spécifications des écrans

> Fait foi pour l'interface (cahier des charges section 8). Décrit le fonctionnement de chaque écran (contenu, champs, actions, messages, navigation), pas son apparence (D-014). Rédigé dans le projet Claude, écran par écran, avant le développement de chaque écran.

| | |
|---|---|
| **Version** | 1.2 |
| **Date** | 17/11/2026 |
| **Écrans spécifiés** | Liste des activités, Saisie / modification (J1) ; Paramètres, Administration › Grades, Natures, Grille de taux (J2) |

## 1. Règles communes

- **Niveau de finition :** composants shadcn/ui par défaut, mise en page simple ; mobile first, utilisable à une main (D-014, section 5 du cahier des charges).
- **Formats :** dates en français (« ven. 26/06/2026 »), heures sur 24 h, fuseau Europe/Paris ; durées « 3 h 15 » ; montants « 15,50 € ».
- **Hors ligne :** message clair (bandeau existant) ; aucun enregistrement possible ; le formulaire en cours conserve sa saisie.
- **Confirmations :** boîte de dialogue de l'application (composant shadcn/ui), jamais une boîte de dialogue du navigateur.
- **En-tête et menu :** bouton de déconnexion dans l'en-tête. Un menu de navigation, toujours accessible et utilisable à une main, propose « Activités », « Paramètres » et, pour l'administrateur seulement, « Administration ». L'e-mail de l'utilisateur n'est jamais affiché dans l'en-tête.
- **Navigation :** un utilisateur non connecté qui ouvre une adresse protégée est renvoyé vers la connexion, puis vers l'adresse demandée après connexion. Après connexion, l'écran d'arrivée est la liste des activités. Le bouton « retour » du téléphone fonctionne entre les écrans.
- **Administrateur :** profil dont le rôle est `admin` et qui est actif (même règle que la fonction `is_admin()` de la base).
- **Accès réservé :** un utilisateur qui n'est pas administrateur et ouvre une adresse `/admin/…` voit le message « Accès réservé à l'administrateur » et un bouton « Retour aux activités ». Masquer le menu n'est qu'un confort : la protection est assurée par la base (RLS).
- **Messages de réussite :** affichés en haut de l'écran concerné (« Grade ajouté », etc.).
- **Erreur réseau ou serveur :** message ; le formulaire en cours conserve sa saisie.
- **Dates d'effet :** une date est « passée » si elle est antérieure ou égale à la date du jour à Paris ; « future » sinon.
- **Taux :** affichés « 12,00 €/h » ; saisis en euros, 2 décimales au plus, positifs ou nuls (D-027).

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

- Seules les natures actives sont proposées à la création. En modification, si la nature de l'activité est archivée, elle reste affichée, signalée « Archivée », et peut être conservée (D-018).
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

## 5. Paramètres — `/parametres`

**Objectif :** renseigner son grade et son historique de grades (D-017), consulter les taux de son grade, gérer son compte.

**5.1 Mon grade**
- **Grade actuel :** grade en vigueur à la date du jour (Paris). S'il n'y en a aucun : « Aucun grade renseigné : vos activités sont en « taux manquant ». Ajoutez votre grade. »
- **Historique :** une ligne par grade (grade, date d'effet), de la plus récente à la plus ancienne ; mentions « Actuel » ou « À venir » ; un grade archivé reste affiché, signalé « Archivé ».
- **Ajouter un grade :** champs grade (grades actifs seulement, D-018) et date d'effet (date du jour par défaut), tous deux obligatoires.
  - Date d'effet passée : confirmation « Les montants de vos activités à partir du JJ/MM/AAAA seront recalculés. » (D-021) ; choix « Confirmer » / « Annuler ».
  - Date d'effet future : pas de confirmation.
- **Corriger** une ligne : grade et date d'effet modifiables ; un grade archivé déjà présent peut être conservé. Même confirmation si la date d'effet résultante, ancienne ou nouvelle, est passée.
- **Supprimer** une ligne : confirmation « Supprimer cette ligne ? Les montants de vos activités concernées seront recalculés. »
- **Contrôle :** une seule ligne par date d'effet (D-028) : « Un grade est déjà enregistré à cette date. »
- **Messages :** « Grade ajouté », « Grade modifié », « Grade supprimé ».

**5.2 Taux de mon grade (lecture seule)**
- Pour le grade actuel, une ligne par nature active : taux en vigueur et sa date d'effet (« 12,00 €/h depuis le 01/01/2026 »), puis le prochain taux s'il existe (« 12,50 €/h à partir du 01/07/2027 ») ; « Aucun taux » sinon.
- Aucune action possible.
- Sans grade actuel : « Renseignez votre grade pour voir vos taux. »

**5.3 Compte**
- Adresse e-mail, en lecture seule.
- Bouton « Changer le mot de passe » : envoie le lien de réinitialisation par e-mail (mécanisme existant) ; message « Un lien de réinitialisation vous a été envoyé par e-mail. »

## 6. Administration (administrateur uniquement)

**6.1 Règles communes à l'administration**
- Adresses : `/admin` redirige vers `/admin/grades` ; trois onglets : Grades (`/admin/grades`), Natures (`/admin/natures`), Grille de taux (`/admin/taux`).
- Les éléments archivés restent visibles, signalés « Archivé(e) », et peuvent être réactivés (D-018).
- Archiver et réactiver se font sans confirmation (aucun effet sur le calcul, D-018).
- La suppression est toujours proposée, avec confirmation. Si l'élément a déjà servi, la base la refuse et un message invite à l'archiver (D-018). L'application ne cherche pas à savoir à l'avance si un élément a servi, car l'administrateur ne peut pas lire les données des autres utilisateurs (RLS), sauf pour l'indicateur « Est une astreinte » (6.3).

**6.2 Grades — `/admin/grades`**
- **Liste :** grades actifs triés par ordre hiérarchique, puis grades archivés ; libellé et ordre.
- **Ajouter :** libellé (obligatoire, unique sans distinction de casse, D-024) et ordre (nombre entier, obligatoire). Le grade est actif dès sa création.
- **Modifier :** libellé et ordre, à tout moment.
- **Archiver / Réactiver.**
- **Supprimer :** confirmation « Supprimer ce grade ? » ; refus de la base : « Ce grade a déjà servi : archivez-le plutôt. »
- **Messages :** « Grade ajouté », « Grade modifié », « Grade supprimé », « Un grade porte déjà ce libellé. »

**6.3 Natures — `/admin/natures`**
- **Liste :** natures actives triées par ordre d'affichage, puis natures archivées ; libellé, code, mention « Astreinte » le cas échéant.
- **Ajouter :** libellé (obligatoire, unique sans distinction de casse, D-026), code (obligatoire, unique sans distinction de casse, D-023), ordre (nombre entier, obligatoire), case « Est une astreinte ». La nature est active dès sa création.
- **Modifier :** libellé, code et ordre à tout moment (D-023). La case « Est une astreinte » n'est modifiable que si aucune activité n'utilise la nature ; sinon elle est grisée, avec l'explication : « Cette nature a déjà été utilisée. Pour changer ce comportement, créez une nouvelle nature et archivez celle-ci. » (D-022)
- **Archiver / Réactiver :** une nature archivée n'est plus proposée à la saisie d'une nouvelle activité.
- **Supprimer :** confirmation « Supprimer cette nature ? » ; refus de la base : « Cette nature a déjà servi : archivez-la plutôt. »
- **Messages :** « Nature ajoutée », « Nature modifiée », « Nature supprimée », « Une nature porte déjà ce libellé. », « Une nature porte déjà ce code. »

**6.4 Grille de taux — `/admin/taux`**
- **Choix du grade :** premier grade par ordre hiérarchique présélectionné ; grade conservé dans l'adresse (`?grade=<id>`), un identifiant inconnu étant ignoré ; les grades archivés restent proposés, signalés « Archivé ».
- **Une ligne par nature** (actives puis archivées, signalées) : taux en vigueur aujourd'hui et sa date d'effet, prochain taux s'il existe, ou « Aucun taux » (mêmes formats qu'en 5.2).
- **Toucher une ligne** ouvre l'historique du couple grade × nature : lignes triées de la plus récente à la plus ancienne, marquées « À venir », « En vigueur » ou « Passé ».
- **Nouveau taux** (action principale, D-019) : grade et nature préremplis, taux en €/h, date d'effet ; tous obligatoires.
  - Date d'effet passée : confirmation « Cette date d'effet est passée : les montants des activités à partir du JJ/MM/AAAA seront recalculés. » (D-020)
  - Date d'effet future : pas de confirmation.
- **Corriger** une ligne (correction d'une erreur de saisie, D-019) : taux et date d'effet modifiables ; confirmation « Cette correction modifie les montants des activités concernées. », complétée par le message de D-020 si la nouvelle date d'effet est passée.
- **Supprimer** une ligne : confirmation « Supprimer ce taux ? Les activités concernées reprendront le taux précédent, ou passeront en « taux manquant ». »
- Les messages de confirmation sont génériques : l'application ne dénombre pas les activités concernées (RLS, D-019).
- **Messages :** « Taux ajouté », « Taux corrigé », « Taux supprimé », « Un taux existe déjà pour ce grade, cette nature et cette date d'effet. »

## 7. Historique

| Version | Date | Modifications |
|---|---|---|
| 1.0 | 14/11/2026 | Première version : règles communes, liste des activités, saisie / modification (J1). |
| 1.1 | 14/11/2026 | Précisions issues du plan de l'étape 1.2b : en-tête, conservation du mois et du filtre, totaux non filtrés, messages, champs date et heure séparés, valeurs par défaut (nature, arrondi, fin au lendemain), chevauchements multiples, astreinte en anomalie, activité introuvable. |
| 1.2 | 17/11/2026 | Écrans du J2 : menu de navigation et accès réservé, Paramètres, Administration (Grades, Natures, Grille de taux) ; natures archivées dans la saisie. Décisions D-017 à D-028. |
