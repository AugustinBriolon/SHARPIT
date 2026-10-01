import { describe, expect, it, vi } from 'vitest';
import { fetchOffProduct, searchOffProducts } from './open-food-facts-client';

const SKYR = {
  code: '5690845000621',
  product_name: 'Skyr nature',
  brands: 'Isey',
  nutriments: { 'energy-kcal_100g': 62, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 },
};

function respond(status: number, body: unknown) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

describe('fetchOffProduct', () => {
  it('maps the product and names SHARPIT to OFF', async () => {
    const fetcher = respond(200, { status: 1, product: SKYR });

    const food = await fetchOffProduct('5690845000621', fetcher);

    expect(food?.name).toBe('Skyr nature');
    const [url, init] = vi.mocked(fetcher).mock.calls[0]!;
    expect(String(url)).toContain('/api/v2/product/5690845000621.json?fields=');
    expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^SHARPIT\//);
  });

  it('says unknown for a product OFF does not have, and never calls OFF for a non-barcode', async () => {
    expect(await fetchOffProduct('5690845000621', respond(404, {}))).toBeNull();
    expect(await fetchOffProduct('5690845000621', respond(200, { status: 0 }))).toBeNull();
    const fetcher = respond(200, {});
    expect(await fetchOffProduct('skyr', fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('throws when OFF is down, so the caller can say so', async () => {
    await expect(fetchOffProduct('5690845000621', respond(503, {}))).rejects.toThrow('503');
  });
});

describe('searchOffProducts', () => {
  it('keeps only the hits the log can use', async () => {
    const fetcher = respond(200, { hits: [SKYR, { code: '1', product_name: 'Sans valeurs' }] });

    const foods = await searchOffProducts('skyr', { fetcher });

    expect(foods.map((food) => food.barcode)).toEqual(['5690845000621']);
    expect(String(vi.mocked(fetcher).mock.calls[0]![0])).toContain('q=skyr');
  });
});
