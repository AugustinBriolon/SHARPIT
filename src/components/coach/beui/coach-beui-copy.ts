export const coachBeuiCopy = {
  emptyHint:
    'Pose une question à ton coach. Il connaît ta forme, ta récupération, tes seuils et tes objectifs.',
  composerPlaceholder: 'Demande conseil à ton coach…',
  composerPlaceholderOffline: 'Hors ligne, envoi indisponible',
  composerPlaceholderPendingApproval:
    "Réponds à la proposition, ou envoie un nouveau message pour l'ignorer…",
  composerAriaLabel: 'Message au coach',
  sendAriaLabel: 'Envoyer le message',
  stopAriaLabel: 'Arrêter la génération',
  drafting: 'Le coach rédige…',
  transcriptLabel: 'Conversation avec le coach',
  jumpToLatest: 'Aller au dernier message',
  pendingApprovalOne: 'Proposition en attente',
  pendingApprovalMany: 'Propositions en attente',
  approvalsRegionLabel: 'Propositions à valider',
  retryLater: 'Réessayer plus tard',
  genericError: 'Une erreur est survenue. Réessaie dans un instant.',
  approve: 'Valider',
  reject: 'Refuser',
  delete: 'Supprimer',
  approvalRequired: 'Validation requise',
  deleteConsequence: (date?: string) =>
    date
      ? `Cette séance sera retirée du plan (${date}). Action irréversible.`
      : 'Cette séance sera retirée du plan. Action irréversible.',
  confirmDelete: 'Confirmer la suppression',
  agentWorking: 'Le coach analyse…',
  agentToolsWorking: 'Exécution des outils…',
  agentToolsComplete: (count: number) =>
    `${count} ${count === 1 ? 'outil exécuté' : 'outils exécutés'}`,
  suggestionsAriaLabel: 'Suggestions',
} as const;
