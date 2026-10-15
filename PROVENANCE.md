# pitch-black-gallery - source of truth

Established by the `estate-sot` lane, 16 October 2026. Plan: `C:/Hecate-Umbra/work/source-of-truth-20261015/SOURCE-OF-TRUTH-PLAN.md`.
Decision record: `C:/Hecate-Umbra/estate/decisions/pitch-black-gallery.md`.

## What this repo is

The Pages project `pitch-black-gallery` (production `https://pitch.black.gallery/`).
This is a **static 3D virtual-office site**. It has no build recipe: the HTML, CSS and JS are
hand-authored and deployed directly. There is no `build.py`, no `package.json`, no bundler.

## Confirmed winner

`C:/Hecate-Umbra/releases/gallery-sorceress-20260928/site/`

Confirmed by three independent bindings, not by directory name:

1. `releases/gallery-sorceress-20260928/wrangler.toml` declares
   `name = "pitch-black-gallery"` with `pages_build_output_dir = "site"`.
2. `releases/gallery-sorceress-20260928/site/index.html` is **byte-identical** to the live
   `https://pitch-black-gallery.pages.dev/` response
   (18,534 B, sha256 `6185771e3902669525315ce94421bbacbc5bcd8dd89640ca501227e51eb2f22a`).
3. `releases/gallery-sorceress-20260928/DEPLOYED.json` records deployment
   `17904a61-c290-4d6b-bdad-074004cdbbdc` against project `pitch-black-gallery`.

## The custom domain is the same bytes

`pitch.black.gallery` and `pitch-black-gallery.pages.dev` differ only by a Cloudflare-injected
Web Analytics beacon. After removing that single injected `<script>` tag the two responses are
**byte-identical**. The custom domain adds no content of its own. This is confirmed on all
three routes: `/`, `/gallery/`, `/profile/`.

## Excluded, and why

- **Media** (127,471,967 B across 100 files) is excluded by rule. It belongs in R2. That includes
  `characters/sorceress.glb` (19,694,256 B), `characters/artemis.glb`, the god texture set,
  and the 36-file `art/` portrait series.
- **`sites/pitch-black-gallery/`** is a *different site* (Pitch Black Industries enterprise
  profile, "TWELVE ARMS"), despite the similar name. It has no `sorceress` or `office.js`
  reference. Not this project.
- **`sites/pitch-black-gallery-v3/`, `sites/_deploy_black_gallery/`, `sites/black-gallery-rebuild/`,
  `sites/websites-black-gallery/`, `sites/videoguide-black-gallery/`, `WEBSITES/black.gallery/`**
  all carry the gallery name but none matches live bytes. Two of them name
  `videoguide-black-gallery` and `websites-black-gallery` as their *own* wrangler projects.

## Known live defect — recorded, not silently repaired

`/gallery/` serves **two links to a forbidden domain** (`[REMOVED-FORBIDDEN-DOMAIN].com.au`) and
`gallery/content-index.json` lists it once. `real-building.js` also names it in a decor-reference
string. Live verification: `https://pitch-black-gallery.pages.dev/gallery/` returns the forbidden
string twice; `/` and `/profile/` return zero.

Per the lane rule the winner is committed as-is and the defect is recorded here rather than
silently edited. **This is an open item for operator decision** — see the decision record.

## What was NOT verified

- No browser rendering check was performed; only HTTP status, byte count and SHA-256.
- Only 3 of the project's routes were probed; the site's full route list was not enumerated.
- `characters/` source `.js`/`.json` files were committed, but the runtime models they load were not
  executed, so the code-to-asset contract is unproven.
- No physical-device test. The release notes record one for an earlier deployment; none was run here.
- Cloudflare was read only. Nothing was deployed, and no Worker or DNS was touched.