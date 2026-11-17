import { useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  avecStatut,
  dateParis,
  estDateEffetPassee,
  tauxCouple,
  texteProchainTaux,
  texteTauxEnVigueur,
} from '@/data/affichage-referentiel'
import type { StatutLigne } from '@/data/affichage-referentiel'
import type { LigneGrade, LigneNature, LigneTaux } from '@/data/conversions'
import type { CorrectionTaux } from '@/data/requetes-referentiel'
import {
  BoutonsFormulaire,
  ChampTexte,
  Confirmation,
  EtatLecture,
  MessageErreur,
  MessageReussite,
  Section,
} from '@/components/communs'
import { MESSAGES, messageDateEffetPassee, messageErreur } from '@/features/admin/messages'
import { choisirGrade, lireSaisieTaux, tauxVersChamp } from '@/features/admin/regles-admin'
import type { ChampTaux, ChampsTaux } from '@/features/admin/regles-admin'
import {
  useCorrigerTaux,
  useCreerTaux,
  useGrades,
  useHistoriqueTaux,
  useNatures,
  useSupprimerTaux,
  useTauxDuGrade,
} from '@/hooks/useAdministrationReferentiel'
import { useEnLigne } from '@/hooks/useEnLigne'
import { formaterJour, formaterTaux } from '@/lib/formats'
import { adresseTaux } from '@/routes/adresses'

const LIBELLES_STATUT: Record<StatutLigne, string> = {
  a_venir: 'À venir',
  en_vigueur: 'En vigueur',
  passe: 'Passé',
}

// Administration › Grille de taux — /admin/taux (spécifications 6.4).
//
// Le grade affiché est dans l'adresse (?grade=<id>) ; un identifiant inconnu
// est ignoré et le premier grade par ordre hiérarchique est présélectionné.
// Toucher une ligne ouvre l'historique du couple grade × nature, lui aussi
// dans l'adresse (&nature=<id>) : le bouton « retour » ramène à la grille.
//
// Taux en vigueur, prochain taux et statuts viennent du moteur de calcul
// (src/data/affichage-referentiel.ts) : aucune règle n'est réécrite ici.
export function TauxScreen() {
  const [parametres, setParametres] = useSearchParams()
  const grades = useGrades()
  const natures = useNatures()

  const gradeId = choisirGrade(grades.data ?? [], parametres.get('grade'))
  const grade = grades.data?.find((g) => g.id === gradeId) ?? null
  const nature = natures.data?.find((n) => n.id === parametres.get('nature')) ?? null

  // Date du jour à Paris, lue une seule fois à l'ouverture de l'écran.
  const [aujourdhui] = useState(() => dateParis(new Date()))

  const enChargement = grades.isPending || natures.isPending
  const enErreur = grades.isError || natures.isError

  return (
    <Section titre="Grille de taux">
      <EtatLecture enChargement={enChargement} erreur={enErreur} />

      {grades.data && grades.data.length === 0 && (
        <p className="text-muted-foreground">Aucun grade.</p>
      )}

      {grades.data && grade && natures.data && (
        <>
          <ChoixGrade
            grades={grades.data}
            gradeId={grade.id}
            onChoisir={(id) => setParametres({ grade: id })}
          />
          {nature ? (
            <HistoriqueCouple
              // Un historique neuf (messages compris) par couple.
              key={`${grade.id}-${nature.id}`}
              grade={grade}
              nature={nature}
              aujourdhui={aujourdhui}
            />
          ) : (
            <Grille grade={grade} natures={natures.data} aujourdhui={aujourdhui} />
          )}
        </>
      )}
    </Section>
  )
}

function libelleGrade(grade: LigneGrade): string {
  return grade.actif ? grade.libelle : `${grade.libelle} (Archivé)`
}

/** Liste déroulante native des grades ; les grades archivés restent proposés, signalés. */
function ChoixGrade({
  grades,
  gradeId,
  onChoisir,
}: {
  grades: readonly LigneGrade[]
  gradeId: string
  onChoisir: (id: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        Grade
      </label>
      <select
        id={id}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={gradeId}
        onChange={(e) => onChoisir(e.target.value)}
      >
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {libelleGrade(grade)}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Une ligne par nature (actives puis archivées) : taux en vigueur, prochain taux, ou « Aucun taux ». */
function Grille({
  grade,
  natures,
  aujourdhui,
}: {
  grade: LigneGrade
  natures: readonly LigneNature[]
  aujourdhui: string
}) {
  const taux = useTauxDuGrade(grade.id)

  if (taux.isPending || taux.isError) {
    return <EtatLecture enChargement={taux.isPending} erreur={taux.isError} />
  }
  if (natures.length === 0) {
    return <p className="text-muted-foreground">Aucune nature.</p>
  }

  return (
    <ul aria-label="Taux par nature" className="flex flex-col gap-2">
      {natures.map((nature) => {
        const { enVigueur, prochain } = tauxCouple(taux.data, grade.id, nature.id, aujourdhui)
        return (
          <li key={nature.id}>
            <Link
              to={adresseTaux(grade.id, nature.id)}
              className="flex flex-col gap-1 rounded-md border p-3 text-sm hover:bg-muted"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{nature.libelle}</span>
                {!nature.actif && <Badge variant="secondary">Archivée</Badge>}
              </span>
              <span>{enVigueur ? texteTauxEnVigueur(enVigueur) : 'Aucun taux'}</span>
              {prochain && (
                <span className="text-muted-foreground">{texteProchainTaux(prochain)}</span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Écriture demandée dans l'historique d'un couple. */
type Action =
  | { type: 'nouveau'; saisie: CorrectionTaux }
  | { type: 'correction'; ligne: LigneTaux; saisie: CorrectionTaux }
  | { type: 'suppression'; ligne: LigneTaux }

/** Action en attente de confirmation, avec le texte de la boîte de dialogue. */
interface AConfirmer {
  action: Action
  titre: string
  paragraphes: string[]
}

/**
 * Confirmation à demander avant une écriture (spécifications 6.4), ou null
 * s'il n'en faut pas :
 * - nouveau taux : seulement si la date d'effet est passée (D-020) ;
 * - correction : toujours (D-019), complétée par le message de D-020 si la
 *   nouvelle date d'effet est passée ;
 * - suppression : toujours.
 * Lit l'horloge : à appeler au moment de l'action, jamais pendant l'affichage.
 */
function confirmationPour(action: Action): AConfirmer | null {
  if (action.type === 'suppression') {
    return {
      action,
      titre: MESSAGES.confirmationSuppressionTaux,
      paragraphes: [MESSAGES.detailSuppressionTaux],
    }
  }
  const passee = estDateEffetPassee(action.saisie.dateEffet, new Date())
  const avertissementDate = messageDateEffetPassee(action.saisie.dateEffet)
  if (action.type === 'nouveau') {
    return passee ? { action, titre: 'Nouveau taux', paragraphes: [avertissementDate] } : null
  }
  return {
    action,
    titre: 'Corriger le taux',
    paragraphes: passee
      ? [MESSAGES.confirmationCorrectionTaux, avertissementDate]
      : [MESSAGES.confirmationCorrectionTaux],
  }
}

/**
 * Historique d'un couple grade × nature : lignes de la plus récente à la plus
 * ancienne, marquées « À venir », « En vigueur » ou « Passé » ; « Nouveau
 * taux » (action principale, D-019), « Corriger » et « Supprimer ».
 */
function HistoriqueCouple({
  grade,
  nature,
  aujourdhui,
}: {
  grade: LigneGrade
  nature: LigneNature
  aujourdhui: string
}) {
  const historique = useHistoriqueTaux(grade.id, nature.id)
  const creer = useCreerTaux()
  const corriger = useCorrigerTaux()
  const supprimer = useSupprimerTaux()
  const enLigne = useEnLigne()

  const [ajout, setAjout] = useState(false)
  const [enCorrection, setEnCorrection] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<AConfirmer | null>(null)
  // Erreur d'un enregistrement confirmé, renvoyée au formulaire resté ouvert.
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null)

  function effacerMessages() {
    setReussite(null)
    setErreur(null)
    setErreurFormulaire(null)
  }

  /** Demande une écriture : confirmation d'abord si elle est nécessaire. */
  function demander(action: Action) {
    const confirmation = confirmationPour(action)
    if (confirmation === null) void executer(action)
    else setAConfirmer(confirmation)
  }

  async function executer(action: Action) {
    setAConfirmer(null)
    setErreurFormulaire(null)
    setErreur(null)
    if (!enLigne) {
      if (action.type === 'suppression') setErreur(MESSAGES.horsLigne)
      else setErreurFormulaire(MESSAGES.horsLigne)
      return
    }
    try {
      if (action.type === 'nouveau') {
        await creer.mutateAsync({ gradeId: grade.id, natureId: nature.id, ...action.saisie })
        setAjout(false)
        setReussite(MESSAGES.tauxAjoute)
      } else if (action.type === 'correction') {
        await corriger.mutateAsync({ id: action.ligne.id, correction: action.saisie })
        setEnCorrection(null)
        setReussite(MESSAGES.tauxCorrige)
      } else {
        await supprimer.mutateAsync(action.ligne.id)
        setReussite(MESSAGES.tauxSupprime)
      }
    } catch (e) {
      // Doublon, réseau… : le formulaire reste ouvert avec sa saisie.
      if (action.type === 'suppression') setErreur(messageErreur(e))
      else setErreurFormulaire(messageErreur(e))
    }
  }

  const occupe = creer.isPending || corriger.isPending || supprimer.isPending
  const lignes = historique.data ? avecStatut(historique.data, aujourdhui) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">
          {libelleGrade(grade)} · {nature.libelle}
          {!nature.actif && ' (Archivée)'}
        </h3>
        <Link to={adresseTaux(grade.id)} className="self-start text-sm underline">
          Retour à la grille
        </Link>
      </div>

      <MessageReussite message={reussite} />
      <MessageErreur message={erreur} />

      {ajout ? (
        <FormulaireTaux
          titre="Nouveau taux"
          initial={{ taux: '', dateEffet: '' }}
          occupe={occupe}
          erreurExterne={erreurFormulaire}
          onValider={(saisie) => demander({ type: 'nouveau', saisie })}
          onAnnuler={() => {
            setAjout(false)
            setErreurFormulaire(null)
          }}
        />
      ) : (
        <Button
          className="self-start"
          onClick={() => {
            effacerMessages()
            setEnCorrection(null)
            setAjout(true)
          }}
        >
          Nouveau taux
        </Button>
      )}

      <EtatLecture enChargement={historique.isPending} erreur={historique.isError} />

      {historique.data && lignes.length === 0 && (
        <p className="text-muted-foreground">Aucun taux</p>
      )}

      {lignes.length > 0 && (
        <ul aria-label="Historique des taux" className="flex flex-col gap-2">
          {lignes.map(({ ligne, statut }) => (
            <li key={ligne.id} className="rounded-md border p-3 text-sm">
              {enCorrection === ligne.id ? (
                <FormulaireTaux
                  titre="Corriger le taux"
                  initial={{ taux: tauxVersChamp(ligne.taux_horaire), dateEffet: ligne.date_effet }}
                  occupe={occupe}
                  erreurExterne={erreurFormulaire}
                  onValider={(saisie) => demander({ type: 'correction', ligne, saisie })}
                  onAnnuler={() => {
                    setEnCorrection(null)
                    setErreurFormulaire(null)
                  }}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{formaterTaux(ligne.taux_horaire)}</span>
                    <Badge variant={statut === 'en_vigueur' ? 'default' : 'secondary'}>
                      {LIBELLES_STATUT[statut]}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    Date d’effet : {formaterJour(ligne.date_effet)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        setAjout(false)
                        setEnCorrection(ligne.id)
                      }}
                    >
                      Corriger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        effacerMessages()
                        demander({ type: 'suppression', ligne })
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Confirmation
        ouverte={aConfirmer !== null}
        titre={aConfirmer?.titre ?? ''}
        paragraphes={aConfirmer?.paragraphes ?? []}
        action={aConfirmer?.action.type === 'suppression' ? 'Supprimer' : 'Confirmer'}
        onConfirmer={() => {
          if (aConfirmer) void executer(aConfirmer.action)
        }}
        onAnnuler={() => setAConfirmer(null)}
      />
    </div>
  )
}

/**
 * Formulaire de taux (nouveau taux ou correction) : taux en €/h et date
 * d'effet, tous deux obligatoires. La confirmation éventuelle et
 * l'enregistrement sont faits par l'historique ; la saisie reste affichée
 * tant que l'enregistrement n'a pas réussi.
 */
function FormulaireTaux({
  titre,
  initial,
  occupe,
  erreurExterne,
  onValider,
  onAnnuler,
}: {
  titre: string
  initial: ChampsTaux
  occupe: boolean
  /** Erreur de l'enregistrement (doublon, réseau…), affichée dans le formulaire. */
  erreurExterne: string | null
  onValider: (saisie: CorrectionTaux) => void
  onAnnuler: () => void
}) {
  const [champs, setChamps] = useState(initial)
  const [erreurs, setErreurs] = useState<Partial<Record<ChampTaux, string>>>({})

  function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const lecture = lireSaisieTaux(champs)
    setErreurs(lecture.erreurs)
    if (lecture.saisie !== null) onValider(lecture.saisie)
  }

  return (
    <form onSubmit={soumettre} aria-label={titre} className="flex flex-col gap-3" noValidate>
      <h4 className="font-medium">{titre}</h4>
      <ChampTexte
        libelle="Taux (€/h)"
        inputMode="decimal"
        valeur={champs.taux}
        onChange={(taux) => setChamps((c) => ({ ...c, taux }))}
        erreur={erreurs.taux}
      />
      <ChampTexte
        libelle="Date d’effet"
        type="date"
        valeur={champs.dateEffet}
        onChange={(dateEffet) => setChamps((c) => ({ ...c, dateEffet }))}
        erreur={erreurs.dateEffet}
      />
      <MessageErreur message={erreurExterne} />
      <BoutonsFormulaire occupe={occupe} onAnnuler={onAnnuler} />
    </form>
  )
}
