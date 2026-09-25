const FEEDBACK_MAIL = 'augustin.briolon@gmail.com';

function mailto(subject: string, body: string) {
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Direct mailto targets for `/moi` Support rows (no intermediate feedback page). */
export const FEEDBACK_FEATURE_MAILTO = mailto(
  'SHARPIT — demande',
  'Décris ce que tu voudrais voir dans SHARPIT :\n\n',
);

export const FEEDBACK_BUG_MAILTO = mailto(
  'SHARPIT — bug',
  'Décris ce qui s’est passé, sur quelle page, et ce que tu attendais :\n\n',
);
