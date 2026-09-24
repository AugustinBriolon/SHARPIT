# Design — Morning wellness modal edit hydrate

Binary PNG evidence that opening **Ressenti du matin** with an existing day entry prefills `ScalePicker` (saved score selected). First-time fill stays unset.

| File                                             | State                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `morning-wellness-modal-edit-hydrate-mobile.png` | Mobile (390×844) modal Humeur step with tile **3** pre-selected (edit open) |

## Capture method

Local HTML fixture mirroring the modal scale step after hydrate, rendered headless at iPhone width. Vercel preview is auth-gated.

Copy: French athlete strings, no em dashes in UI copy. No **Pris en compte** badge on the modal (#124).
