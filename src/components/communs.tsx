// Éléments communs aux écrans d'administration et de paramètres : messages,
// champs et boîte de confirmation. Composants shadcn/ui par défaut, sans
// travail graphique (D-014).

import { useId, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MESSAGES_COMMUNS } from '@/lib/messages'

/** Message de réussite, en haut de l'écran (spécifications, règles communes). */
export function MessageReussite({ message }: { message: string | null }) {
  if (message === null) return null
  return (
    <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
      {message}
    </p>
  )
}

/** Message d'erreur (refus de la base, réseau…). */
export function MessageErreur({ message }: { message: string | null | undefined }) {
  if (message === null || message === undefined) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

/** États de chargement et d'erreur d'une lecture. */
export function EtatLecture({ enChargement, erreur }: { enChargement: boolean; erreur: boolean }) {
  const queryClient = useQueryClient()
  if (erreur) {
    return (
      <div className="flex flex-col items-start gap-2">
        <MessageErreur message={MESSAGES_COMMUNS.erreurChargement} />
        <Button variant="outline" onClick={() => queryClient.refetchQueries()}>
          Réessayer
        </Button>
      </div>
    )
  }
  if (enChargement) {
    return (
      <p role="status" className="text-muted-foreground">
        Chargement…
      </p>
    )
  }
  return null
}

/** Champ de saisie texte avec son libellé et son erreur. */
export function ChampTexte({
  libelle,
  valeur,
  onChange,
  erreur,
  type = 'text',
  inputMode,
}: {
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  erreur?: string
  type?: 'text' | 'date'
  inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{libelle}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={valeur}
        aria-invalid={erreur !== undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <MessageErreur message={erreur} />
    </div>
  )
}

/**
 * Boîte de confirmation de l'application (jamais celle du navigateur).
 * `paragraphes` : le texte de la confirmation, tel que dans les spécifications.
 */
export function Confirmation({
  ouverte,
  titre,
  paragraphes,
  action,
  onConfirmer,
  onAnnuler,
}: {
  ouverte: boolean
  titre: string
  paragraphes: readonly string[]
  /** Libellé du bouton de confirmation (« Supprimer », « Confirmer »). */
  action: string
  onConfirmer: () => void
  onAnnuler: () => void
}) {
  return (
    <AlertDialog
      open={ouverte}
      onOpenChange={(ouvert) => {
        if (!ouvert) onAnnuler()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titre}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-1">
              {paragraphes.map((paragraphe) => (
                <p key={paragraphe}>{paragraphe}</p>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmer}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Boutons « Enregistrer » et « Annuler » d'un formulaire. */
export function BoutonsFormulaire({ occupe, onAnnuler }: { occupe: boolean; onAnnuler: () => void }) {
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={occupe}>
        {occupe ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
      <Button type="button" variant="outline" onClick={onAnnuler}>
        Annuler
      </Button>
    </div>
  )
}

/** Cadre d'une section d'écran, avec son titre. */
export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section aria-label={titre} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{titre}</h2>
      {children}
    </section>
  )
}
