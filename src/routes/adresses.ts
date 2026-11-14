// Adresses des écrans (D-013). Réunies ici pour ne jamais les réécrire à la main.

export const ADRESSES = {
  connexion: '/connexion',
  motDePasseOublie: '/mot-de-passe-oublie',
  nouveauMotDePasse: '/nouveau-mot-de-passe',
  activites: '/activites',
  nouvelleActivite: '/activites/nouvelle',
  activite: (id: string) => `/activites/${id}`,
} as const

/** Adresse de la liste pour un mois (« 2026-06 ») et, au besoin, un filtre de nature. */
export function adresseListe(mois: string, natureId?: string | null): string {
  const parametres = new URLSearchParams({ mois })
  if (natureId) parametres.set('nature', natureId)
  return `${ADRESSES.activites}?${parametres.toString()}`
}

/** Informations transmises d'un écran à l'autre avec la navigation. */
export interface EtatNavigation {
  /** Adresse demandée avant la redirection vers la connexion. */
  depuis?: string
  /** Adresse de la liste d'où vient l'utilisateur (mois et filtre conservés). */
  retour?: string
  /** Message à afficher en haut de la liste (« Activité enregistrée »…). */
  message?: string
}

/** Lit l'état de navigation sans lui faire confiance : seules des chaînes sont gardées. */
export function lireEtatNavigation(etat: unknown): EtatNavigation {
  if (typeof etat !== 'object' || etat === null) return {}
  const brut = etat as Record<string, unknown>
  const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur : undefined)
  // Une adresse interne commence par un seul « / » (jamais un autre site).
  const interne = (valeur: unknown) => {
    const adresse = texte(valeur)
    return adresse !== undefined && /^\/(?!\/)/.test(adresse) ? adresse : undefined
  }
  return {
    depuis: interne(brut.depuis),
    retour: interne(brut.retour),
    message: texte(brut.message),
  }
}
