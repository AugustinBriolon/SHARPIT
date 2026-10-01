import {
  isBarcode,
  mapOffProduct,
  OFF_FIELDS,
  type MappedFood,
  type OffProduct,
} from '@sharpit/app/lib/nutrition/food-log/open-food-facts';

/**
 * Open Food Facts, read from the server only (ADR-061): the athlete's device never calls OFF,
 * so OFF sees SHARPIT's servers, never who scanned what. OFF asks every client to name itself.
 */
const USER_AGENT = 'SHARPIT/1.0 (augustin.briolon@gmail.com)';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const SEARCH_URL = 'https://search.openfoodfacts.org/search';
const TIMEOUT_MS = 6000;

type Fetch = typeof fetch;

async function getJson(url: string, fetcher: Fetch): Promise<unknown | null> {
  const response = await fetcher(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Open Food Facts answered ${response.status}`);
  }
  return response.json();
}

/** The product behind a barcode, or null when OFF does not know it or knows it too poorly. */
export async function fetchOffProduct(
  barcode: string,
  fetcher: Fetch = fetch,
): Promise<MappedFood | null> {
  if (!isBarcode(barcode)) {
    return null;
  }
  const url = `${PRODUCT_URL}/${barcode}.json?fields=${OFF_FIELDS.join(',')}`;
  const body = (await getJson(url, fetcher)) as { status?: number; product?: OffProduct } | null;
  if (!body?.product || body.status === 0) {
    return null;
  }
  return mapOffProduct({ ...body.product, code: body.product.code ?? barcode });
}

/** French-first search, keeping only products the log can use. */
export async function searchOffProducts(
  query: string,
  { limit = 20, fetcher = fetch }: { limit?: number; fetcher?: Fetch } = {},
): Promise<MappedFood[]> {
  const params = new URLSearchParams({
    q: query,
    langs: 'fr,en',
    page_size: String(limit),
    fields: OFF_FIELDS.join(','),
  });
  const body = (await getJson(`${SEARCH_URL}?${params}`, fetcher)) as {
    hits?: OffProduct[];
  } | null;
  return (body?.hits ?? []).map(mapOffProduct).filter((food): food is MappedFood => food !== null);
}
