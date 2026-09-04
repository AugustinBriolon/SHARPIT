export function resolveNutritionLinkTitle({
  disconnected,
  isError,
}: {
  disconnected: boolean;
  isError: boolean;
}) {
  if (isError) {
    return 'Ouvrir le journal alimentaire';
  }
  if (disconnected) {
    return 'Connecter le journal alimentaire';
  }
  return 'Voir le journal alimentaire';
}
