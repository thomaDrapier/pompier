// Opérations sur des plages de temps semi-ouvertes [debut, fin).
//
// « Semi-ouverte » : le début est inclus, la fin est exclue. Deux plages
// contiguës (fin de l'une = début de l'autre) n'ont donc aucun instant en
// commun : elles ne se chevauchent pas (D-010).
//
// Les bornes sont des instants absolus en millisecondes UTC (D-012). Les
// durées restent ainsi justes au changement d'heure : une nuit de passage à
// l'heure d'hiver dure réellement une heure de plus.

/** Plage semi-ouverte [debut, fin), bornes en millisecondes UTC. */
export interface Plage {
  debut: number
  fin: number
}

/**
 * Union d'une liste de plages : renvoie des plages triées, disjointes,
 * où les plages qui se chevauchent ou se touchent sont fusionnées.
 * Les plages vides (fin ≤ début) sont ignorées.
 */
export function union(plages: readonly Plage[]): Plage[] {
  const triees = plages
    .filter((plage) => plage.fin > plage.debut)
    .toSorted((a, b) => a.debut - b.debut)

  const resultat: Plage[] = []
  for (const plage of triees) {
    const derniere = resultat.at(-1)
    if (derniere !== undefined && plage.debut <= derniere.fin) {
      // Chevauchement ou contiguïté : on prolonge la dernière plage.
      derniere.fin = Math.max(derniere.fin, plage.fin)
    } else {
      resultat.push({ debut: plage.debut, fin: plage.fin })
    }
  }
  return resultat
}

/** Intersection : les instants présents à la fois dans A et dans B. */
export function intersection(a: readonly Plage[], b: readonly Plage[]): Plage[] {
  const unionA = union(a)
  const unionB = union(b)
  const resultat: Plage[] = []

  // Parcours simultané des deux listes triées.
  let i = 0
  let j = 0
  while (i < unionA.length && j < unionB.length) {
    const plageA = unionA[i]
    const plageB = unionB[j]
    const debut = Math.max(plageA.debut, plageB.debut)
    const fin = Math.min(plageA.fin, plageB.fin)
    if (debut < fin) {
      resultat.push({ debut, fin })
    }
    // On avance dans la liste dont la plage se termine en premier.
    if (plageA.fin <= plageB.fin) {
      i += 1
    } else {
      j += 1
    }
  }
  return resultat
}

/** Soustraction « A privé de B » : les instants de A absents de B. */
export function soustraire(a: readonly Plage[], b: readonly Plage[]): Plage[] {
  const unionA = union(a)
  const unionB = union(b)
  const resultat: Plage[] = []

  let j = 0
  for (const plageA of unionA) {
    // Début de la partie de plageA qui n'a pas encore été retirée.
    let curseur = plageA.debut

    // Les plages de B terminées avant plageA ne retirent plus rien.
    while (j < unionB.length && unionB[j].fin <= plageA.debut) {
      j += 1
    }

    // Les plages de B qui touchent plageA y creusent des trous.
    let k = j
    while (k < unionB.length && unionB[k].debut < plageA.fin) {
      const plageB = unionB[k]
      if (plageB.debut > curseur) {
        resultat.push({ debut: curseur, fin: plageB.debut })
      }
      curseur = Math.max(curseur, plageB.fin)
      k += 1
    }

    if (curseur < plageA.fin) {
      resultat.push({ debut: curseur, fin: plageA.fin })
    }
  }
  return resultat
}

/**
 * Durée totale couverte par une liste de plages, en millisecondes.
 * Un créneau couvert par plusieurs plages n'est compté qu'une fois.
 */
export function duree(plages: readonly Plage[]): number {
  return union(plages).reduce((total, plage) => total + (plage.fin - plage.debut), 0)
}

/**
 * Vrai si les deux plages ont au moins un instant en commun.
 * Deux plages contiguës ne se chevauchent pas (plages semi-ouvertes).
 */
export function seChevauchent(a: Plage, b: Plage): boolean {
  return a.debut < b.fin && b.debut < a.fin
}
