/**
 * Sharpit risk tiers for Open Food Facts additive tags (`en:e211`, …).
 * Indicator only — not a medical assessment. Unknown codes default to limited.
 */

export type AdditiveRisk = 'none' | 'limited' | 'high';

export type AdditiveInfo = {
  code: string;
  name: string;
  risk: AdditiveRisk;
};

/** Canonical E-code without leading zeros quirks: E300, E150D, … */
function normalizeTag(tag: string): string {
  const match = tag.toLowerCase().match(/e(\d{3,4}[a-z]?)/);
  return match ? `E${match[1]!.toUpperCase()}` : tag.toUpperCase();
}

const NONE: Record<string, string> = {
  E100: 'Curcumine',
  E101: 'Riboflavine',
  E140: 'Chlorophylles',
  E160A: 'Carotènes',
  E160C: 'Extrait de paprika',
  E162: 'Rouge de betterave',
  E163: 'Anthocyanes',
  E170: 'Carbonate de calcium',
  E270: 'Acide lactique',
  E290: 'Dioxyde de carbone',
  E296: 'Acide malique',
  E300: 'Acide ascorbique',
  E301: 'Ascorbate de sodium',
  E306: 'Extraits riches en tocophérols',
  E322: 'Lécithines',
  E330: 'Acide citrique',
  E331: 'Citrates de sodium',
  E332: 'Citrates de potassium',
  E333: 'Citrates de calcium',
  E334: 'Acide tartrique',
  E335: 'Tartrates de sodium',
  E336: 'Tartrates de potassium',
  E337: 'Tartrate de sodium et de potassium',
  E350: 'Malates de sodium',
  E375: 'Acide nicotinique',
  E406: 'Agar-agar',
  E410: 'Farine de graines de caroube',
  E412: 'Gomme de guar',
  E414: 'Gomme arabique',
  E415: 'Gomme xanthane',
  E440: 'Pectines',
  E460: 'Cellulose',
  E471: 'Mono- et diglycérides d’acides gras',
  E500: 'Carbonates de sodium',
  E501: 'Carbonates de potassium',
  E503: 'Carbonates d’ammonium',
  E509: 'Chlorure de calcium',
  E516: 'Sulfate de calcium',
  E901: 'Cire d’abeille',
  E903: 'Cire de carnauba',
  E941: 'Azote',
  E948: 'Oxygène',
};

const HIGH: Record<string, string> = {
  E102: 'Tartrazine',
  E104: 'Jaune de quinoléine',
  E110: 'Jaune orangé S',
  E120: 'Cochenille',
  E122: 'Azorubine',
  E123: 'Amarante',
  E124: 'Ponceau 4R',
  E127: 'Érythrosine',
  E129: 'Rouge allura AC',
  E131: 'Bleu patenté V',
  E132: 'Indigotine',
  E133: 'Bleu brillant FCF',
  E150C: 'Caramel ammoniacal',
  E150D: 'Caramel au sulfite d’ammonium',
  E151: 'Noir brillant BN',
  E171: 'Dioxyde de titane',
  E173: 'Aluminium',
  E180: 'Litholrubine BK',
  E210: 'Acide benzoïque',
  E211: 'Benzoate de sodium',
  E212: 'Benzoate de potassium',
  E213: 'Benzoate de calcium',
  E214: 'P-hydroxybenzoate d’éthyle',
  E215: 'Dérivé sodique de l’ester éthylique',
  E216: 'P-hydroxybenzoate de propyle',
  E217: 'Dérivé sodique de l’ester propylique',
  E218: 'P-hydroxybenzoate de méthyle',
  E219: 'Dérivé sodique de l’ester méthylique',
  E220: 'Anhydride sulfureux',
  E221: 'Sulfite de sodium',
  E222: 'Bisulfite de sodium',
  E223: 'Disulfite de sodium',
  E224: 'Disulfite de potassium',
  E226: 'Sulfite de calcium',
  E227: 'Bisulfite de calcium',
  E228: 'Bisulfite de potassium',
  E230: 'Diphényle',
  E231: 'Orthophénylphénol',
  E232: 'Orthophénylphénate de sodium',
  E249: 'Nitrite de potassium',
  E250: 'Nitrite de sodium',
  E251: 'Nitrate de sodium',
  E252: 'Nitrate de potassium',
  E310: 'Gallate de propyle',
  E311: 'Gallate d’octyle',
  E312: 'Gallate de dodécyle',
  E320: 'BHA',
  E321: 'BHT',
  E407: 'Carraghénanes',
  E450: 'Diphosphates',
  E451: 'Triphosphates',
  E452: 'Polyphosphates',
  E491: 'Monostéarate de sorbitane',
  E620: 'Acide glutamique',
  E621: 'Glutamate monosodique',
  E622: 'Glutamate monopotassique',
  E623: 'Diglutamate de calcium',
  E624: 'Glutamate d’ammonium',
  E625: 'Diglutamate de magnésium',
  E626: 'Acide guanylique',
  E627: 'Guanylate disodique',
  E628: 'Guanylate dipotassique',
  E629: 'Guanylate de calcium',
  E630: 'Acide inosinique',
  E631: 'Inosinate disodique',
  E632: 'Inosinate dipotassique',
  E633: 'Inosinate de calcium',
  E634: '5′-ribonucléotides de calcium',
  E635: '5′-ribonucléotides disodiques',
  E950: 'Acésulfame-K',
  E951: 'Aspartame',
  E952: 'Cyclamates',
  E954: 'Saccharine',
  E955: 'Sucralose',
  E962: 'Sel d’aspartame-acésulfame',
};

const LIMITED: Record<string, string> = {
  E150A: 'Caramel ordinaire',
  E150B: 'Caramel de sulfite caustique',
  E160B: 'Rocou',
  E200: 'Acide sorbique',
  E202: 'Sorbate de potassium',
  E203: 'Sorbate de calcium',
  E250A: 'Nitrite (variante)',
  E280: 'Acide propionique',
  E281: 'Propionate de sodium',
  E282: 'Propionate de calcium',
  E283: 'Propionate de potassium',
  E319: 'TBHQ',
  E338: 'Acide phosphorique',
  E339: 'Phosphates de sodium',
  E340: 'Phosphates de potassium',
  E341: 'Phosphates de calcium',
  E385: 'EDTA de calcium disodium',
  E420: 'Sorbitols',
  E421: 'Mannitol',
  E422: 'Glycérol',
  E432: 'Polysorbate 20',
  E433: 'Polysorbate 80',
  E435: 'Polysorbate 60',
  E436: 'Polysorbate 65',
  E466: 'Carboxyméthylcellulose',
  E472C: 'Esters citriques',
  E472E: 'Esters tartriques',
  E476: 'Polyricinoléate de polyglycérol',
  E481: 'Stéaroyl-2-lactylate de sodium',
  E482: 'Stéaroyl-2-lactylate de calcium',
  E492: 'Tristéarate de sorbitane',
  E493: 'Monolaurate de sorbitane',
  E494: 'Monoléate de sorbitane',
  E495: 'Monopalmitate de sorbitane',
  E920: 'L-cystéine',
  E960: 'Stéviol glycosides',
  E961: 'Néotame',
  E965: 'Maltitols',
  E966: 'Lactitol',
  E967: 'Xylitol',
  E968: 'Érythritol',
};

/**
 * Risk and French display name for an OFF additive tag. Unknown E-codes are limited so we never
 * silently treat an unfamiliar additive as safe.
 */
export function additiveRisk(tag: string): AdditiveInfo {
  const code = normalizeTag(tag);
  if (NONE[code]) {
    return { code, name: NONE[code]!, risk: 'none' };
  }
  if (HIGH[code]) {
    return { code, name: HIGH[code]!, risk: 'high' };
  }
  if (LIMITED[code]) {
    return { code, name: LIMITED[code]!, risk: 'limited' };
  }
  return { code, name: code, risk: 'limited' };
}
