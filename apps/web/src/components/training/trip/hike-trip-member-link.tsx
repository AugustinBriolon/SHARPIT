import Link from 'next/link';

export function HikeTripMemberLink({ hikeTrip }: { hikeTrip: { id: string; name: string } }) {
  return (
    <Link
      className="text-label text-primary hover:text-primary/80 inline-flex transition-colors"
      href={`/activite/sejours/${hikeTrip.id}`}
    >
      Voir le séjour · {hikeTrip.name}
    </Link>
  );
}
