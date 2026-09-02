# V1.1 Chrome — liquid-glass validation (Design)

PNG captures for Design sign-off **before** Plan hub widgets ship.

Scope: glass on **chrome only** (bottom tab bar + floating back). No glass on `/consent`, `/privacy`, `/terms`, content cards, or forms.

| File | Surface | Theme |
| --- | --- | --- |
| `v11-chrome-tabbar-light.png` | Bottom tab bar (`/plan`) | Light |
| `v11-chrome-tabbar-dark.png` | Bottom tab bar (`/plan`) | Dark |
| `v11-chrome-back-light.png` | Floating back (`/training/planning`) | Light |
| `v11-chrome-back-dark.png` | Floating back (`/training/planning`) | Dark |

Implementation: `src/components/chrome/chrome-glass.tsx` (`liquid-glass-react@1.1.1` backdrop + frosted CSS).
