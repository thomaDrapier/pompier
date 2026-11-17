// Messages communs à tous les écrans qui écrivent dans la base
// (spécifications des écrans, règles communes : « Erreur réseau ou serveur :
// message ; le formulaire en cours conserve sa saisie » ; hors ligne : aucun
// enregistrement possible).

export const MESSAGES_COMMUNS = {
  horsLigne: 'Pas de connexion réseau : la modification ne peut pas être enregistrée.',
  erreurServeur: 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.',
  erreurChargement: 'Les données n’ont pas pu être chargées. Vérifiez votre connexion.',
} as const
