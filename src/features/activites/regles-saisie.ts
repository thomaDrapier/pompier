// Règles du formulaire de saisie / modification d'une activité
// (spécifications des écrans, section 3 ; cahier des charges 3.2 ; D-010).
// Fonctions pures : aucun accès à React ni à Supabase.

import { formaterPlage } from '@/lib/formats'
import { instantParis } from '@/lib/temps'

/** Valeurs des champs du formulaire, telles que saisies. */
export interface ChampsSaisie {
  natureId: string
  /** AAAA-MM-JJ et HH:MM, heure de Paris. */
  dateDebut: string
  heureDebut: string
  dateFin: string
  heureFin: string
  note: string
}

/** Saisie complète et cohérente, prête à être enregistrée. */
export interface SaisieValide {
  natureId: string
  debut: Date
  fin: Date
  note: string | null
}

export type ChampEnErreur = 'nature' | 'debut' | 'fin'
export type ErreursChamps = Partial<Record<ChampEnErreur, string>>

/** Activité déjà enregistrée qui chevauche la plage saisie. */
export interface ActiviteVoisine {
  id: string
  natureId: string
  debut: Date
  fin: Date
}

/** Ce qu'il faut savoir d'une nature pour contrôler une saisie. */
export interface NaturePourControle {
  id: string
  libelle: string
  estAstreinte: boolean
}

export interface ResultatConflits {
  /** Message d'un contrôle bloquant, ou null. */
  bloquant: string | null
  /** Messages à confirmer par « Enregistrer quand même ». */
  avertissements: string[]
}

export const MESSAGE_CHAMP_OBLIGATOIRE = 'Ce champ est obligatoire.'
export const MESSAGE_FIN_AVANT_DEBUT = 'La fin doit être après le début.'
export const MESSAGE_DOUBLON = 'Une activité identique existe déjà.'
/** Utilisé quand l'autre astreinte n'est connue que par l'erreur de la base. */
export const MESSAGE_CHEVAUCHEMENT_GENERIQUE = 'Cette astreinte chevauche une autre astreinte.'

/**
 * Contrôles bloquants sur les champs : champs obligatoires, puis fin après
 * le début. Renvoie la saisie prête à enregistrer, ou les champs en erreur.
 */
export function lireSaisie(champs: ChampsSaisie): {
  saisie: SaisieValide | null
  erreurs: ErreursChamps
} {
  const erreurs: ErreursChamps = {}
  if (champs.natureId === '') erreurs.nature = MESSAGE_CHAMP_OBLIGATOIRE

  const debut = instantParis(champs.dateDebut, champs.heureDebut)
  const fin = instantParis(champs.dateFin, champs.heureFin)
  if (debut === null) erreurs.debut = MESSAGE_CHAMP_OBLIGATOIRE
  if (fin === null) erreurs.fin = MESSAGE_CHAMP_OBLIGATOIRE

  if (debut !== null && fin !== null && fin.getTime() <= debut.getTime()) {
    erreurs.fin = MESSAGE_FIN_AVANT_DEBUT
  }

  if (debut === null || fin === null || Object.keys(erreurs).length > 0) {
    return { saisie: null, erreurs }
  }
  const note = champs.note.trim()
  return {
    saisie: { natureId: champs.natureId, debut, fin, note: note === '' ? null : note },
    erreurs,
  }
}

/** Chevauchement en plages semi-ouvertes [début, fin) : deux plages contiguës ne se chevauchent pas. */
function seChevauchent(a: { debut: Date; fin: Date }, b: { debut: Date; fin: Date }): boolean {
  return a.debut.getTime() < b.fin.getTime() && b.debut.getTime() < a.fin.getTime()
}

/**
 * Contrôles par rapport aux activités déjà enregistrées :
 * - bloquant : une astreinte qui chevauche une autre astreinte (D-010) ;
 * - avertissement : doublon exact (même début, fin et nature) ;
 * - avertissement : chevauchement entre deux activités qui ne sont pas des
 *   astreintes.
 * Le chevauchement d'une activité avec une astreinte est normal : aucun message.
 *
 * @param voisines activités de l'utilisateur lues pour ce contrôle
 * @param idEnCours identifiant de l'activité modifiée (elle ne se gêne pas
 *   elle-même), ou null en création
 */
export function verifierConflits(
  saisie: SaisieValide,
  natures: readonly NaturePourControle[],
  voisines: readonly ActiviteVoisine[],
  idEnCours: string | null,
): ResultatConflits {
  const naturesParId = new Map(natures.map((nature) => [nature.id, nature]))
  const estAstreinte = (natureId: string) => naturesParId.get(natureId)?.estAstreinte ?? false
  const libelle = (natureId: string) => naturesParId.get(natureId)?.libelle ?? 'Activité'

  const autres = voisines
    .filter((voisine) => voisine.id !== idEnCours && seChevauchent(saisie, voisine))
    .toSorted((a, b) => a.debut.getTime() - b.debut.getTime())

  // Contrôle bloquant : deux astreintes ne peuvent pas se chevaucher (D-010).
  if (estAstreinte(saisie.natureId)) {
    const astreintes = autres.filter((voisine) => estAstreinte(voisine.natureId))
    if (astreintes.length > 0) {
      const premiere = astreintes[0]
      return {
        bloquant: `Cette astreinte chevauche celle du ${formaterPlage(premiere.debut, premiere.fin)}${suiteAutres(astreintes.length - 1)}.`,
        avertissements: [],
      }
    }
    // Une astreinte peut chevaucher toute autre activité : rien à signaler.
    return { bloquant: null, avertissements: [] }
  }

  const avertissements: string[] = []
  const horsAstreinte = autres.filter((voisine) => !estAstreinte(voisine.natureId))

  const doublons = horsAstreinte.filter(
    (voisine) =>
      voisine.natureId === saisie.natureId &&
      voisine.debut.getTime() === saisie.debut.getTime() &&
      voisine.fin.getTime() === saisie.fin.getTime(),
  )
  if (doublons.length > 0) avertissements.push(MESSAGE_DOUBLON)

  // Les doublons sont déjà signalés : ils ne sont pas répétés ici.
  const chevauchees = horsAstreinte.filter((voisine) => !doublons.includes(voisine))
  if (chevauchees.length > 0) {
    const premiere = chevauchees[0]
    avertissements.push(
      `Cette activité chevauche ${libelle(premiere.natureId)}, ${formaterPlage(premiere.debut, premiere.fin)}${suiteAutres(chevauchees.length - 1)}.`,
    )
  }

  return { bloquant: null, avertissements }
}

/** « et N autre(s) », accordé ; vide s'il n'y en a pas d'autre. */
function suiteAutres(nombre: number): string {
  if (nombre <= 0) return ''
  return nombre === 1 ? ' et 1 autre' : ` et ${nombre} autres`
}
