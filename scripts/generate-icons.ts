// Generates the PWA app icons from a single inline "neon globe" SVG, using the
// `sharp` library we already depend on (no extra design tooling). Run it once
// with `npm run icons`; the PNGs land in public/icons/ and are committed to the
// repo. Re-run it whenever you want to tweak the look.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const BG = "#0a0613"; // deep synthwave night
const CYAN = "#00e5ff";
const MAGENTA = "#ff2d95";
const PINK = "#ff7ac6";

// Build the neon-globe SVG at a given pixel size. `contentScale` is the
// fraction of the canvas the globe spans — smaller for "maskable" icons so the
// important pixels stay inside the platform's safe zone.
function neonGlobeSvg(size: number, contentScale: number): string {
  const c = size / 2; // centre
  const r = (size * contentScale) / 2; // globe radius
  const sw = Math.max(2, size * 0.012); // stroke width

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#160d2b"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
    <radialGradient id="globe" cx="42%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#241247"/>
      <stop offset="100%" stop-color="#0c0720"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="clip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>
  </defs>

  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>

  <!-- magenta atmosphere halo -->
  <circle cx="${c}" cy="${c}" r="${r * 1.04}" fill="none" stroke="${MAGENTA}" stroke-width="${sw * 2.2}" opacity="0.45" filter="url(#glow)"/>

  <!-- globe body -->
  <circle cx="${c}" cy="${c}" r="${r}" fill="url(#globe)" stroke="${CYAN}" stroke-width="${sw}" filter="url(#glow)"/>

  <!-- graticule: meridians + parallels, clipped to the globe -->
  <g clip-path="url(#clip)" stroke="${CYAN}" fill="none" opacity="0.55">
    <ellipse cx="${c}" cy="${c}" rx="${r * 0.4}" ry="${r}" stroke-width="${sw * 0.6}"/>
    <ellipse cx="${c}" cy="${c}" rx="${r * 0.78}" ry="${r}" stroke-width="${sw * 0.5}"/>
    <line x1="${c}" y1="${c - r}" x2="${c}" y2="${c + r}" stroke-width="${sw * 0.6}"/>
    <line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" stroke-width="${sw * 0.6}"/>
    <ellipse cx="${c}" cy="${c}" rx="${r}" ry="${r * 0.42}" stroke-width="${sw * 0.6}"/>
    <ellipse cx="${c}" cy="${c}" rx="${r}" ry="${r * 0.8}" stroke-width="${sw * 0.5}"/>
  </g>

  <!-- a couple of glowing "gig" pins -->
  <g filter="url(#glow)">
    <circle cx="${c - r * 0.32}" cy="${c - r * 0.18}" r="${r * 0.07}" fill="${PINK}"/>
    <circle cx="${c + r * 0.28}" cy="${c + r * 0.3}" r="${r * 0.07}" fill="${CYAN}"/>
    <circle cx="${c + r * 0.05}" cy="${c - r * 0.5}" r="${r * 0.06}" fill="${MAGENTA}"/>
  </g>
</svg>`;
}

async function render(name: string, size: number, contentScale: number) {
  const svg = neonGlobeSvg(size, contentScale);
  const out = path.join(OUT_DIR, name);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`  ✓ ${name} (${size}×${size})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Generating PWA icons →", OUT_DIR);
  // Standard icons: globe fills most of the tile.
  await render("icon-192.png", 192, 0.82);
  await render("icon-512.png", 512, 0.82);
  // Maskable: smaller globe so nothing important is cropped by the OS mask.
  await render("icon-maskable-512.png", 512, 0.62);
  // Apple touch icon: iOS rounds the corners itself, full-bleed is fine.
  await render("apple-touch-icon-180.png", 180, 0.82);
  // Also keep a copy as a generic SVG-free favicon-sized PNG.
  await render("icon-32.png", 32, 0.86);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
