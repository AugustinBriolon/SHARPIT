import { CorpsSectionHeader } from '@/components/corps/corps-ui';

/** En-tête de page Records. */
export function RecordsSectionHeader({
  streamsAnalyzed,
  totalActivities,
}: {
  streamsAnalyzed: number;
  totalActivities: number;
}) {
  return (
    <CorpsSectionHeader
      description={`Performances observées — top 5 par catégorie sur ${totalActivities} séances (${streamsAnalyzed} avec données détaillées).`}
      label="Records"
      title="Meilleures performances"
    />
  );
}
