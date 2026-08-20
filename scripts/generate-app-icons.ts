/**
 * Generates every application icon from the one canonical brand asset,
 * `public/images/logo.png` — the same mark the app header and login screen show.
 *
 * Run with `npm run icons:generate` after changing that logo so the installed
 * app, the browser tab and the in-app header never drift apart.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compositeOver,
  contentBounds,
  createCanvas,
  crop,
  decodePng,
  encodeIco,
  encodePng,
  resize,
  type Rgba,
  type RgbaImage
} from "./lib/png";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_LOGO = join(projectRoot, "public/images/logo.png");

/**
 * The in-app logo is drawn on white surfaces (header, cards, login), so the
 * icons use a solid white plate rather than transparency. It keeps the black
 * paddle visible on dark launchers and dark browser chrome, and maskable icons
 * have to be opaque edge to edge anyway.
 */
const BACKGROUND: Rgba = [255, 255, 255, 255];

/**
 * How much of the icon the artwork should occupy.
 *
 * - `box`: the artwork fits inside a centred square of this fraction. Used for
 *   plain icons, where the whole square stays visible.
 * - `safeCircle`: the smallest circle enclosing the artwork is scaled to this
 *   fraction of the icon. Used for maskable icons, where launchers may crop to
 *   the central 80% circle. Measuring the real pixels rather than the bounding
 *   box avoids padding the icon out for corners that are empty anyway.
 */
type Fit = { type: "box"; fraction: number } | { type: "safeCircle"; fraction: number };

type IconSpec = {
  file: string;
  size: number;
  fit: Fit;
};

const PNG_ICONS: IconSpec[] = [
  // Manifest icons, purpose "any".
  { file: "public/icons/icon-192.png", size: 192, fit: { type: "box", fraction: 0.82 } },
  { file: "public/icons/icon-512.png", size: 512, fit: { type: "box", fraction: 0.82 } },
  // Manifest icons, purpose "maskable".
  { file: "public/icons/icon-maskable-192.png", size: 192, fit: { type: "safeCircle", fraction: 0.8 } },
  { file: "public/icons/icon-maskable-512.png", size: 512, fit: { type: "safeCircle", fraction: 0.8 } },
  // iOS home screen. iOS applies its own rounded mask, so leave the corners clear.
  { file: "src/app/apple-icon.png", size: 180, fit: { type: "box", fraction: 0.8 } }
];

// Browser tab icon. Tighter framing keeps the paddles readable down at 16px.
const FAVICON_FILE = "src/app/favicon.ico";
const FAVICON_SIZES = [16, 32, 48];
const FAVICON_FIT: Fit = { type: "box", fraction: 0.9 };

/** Largest distance from the artwork centre to a pixel that is actually drawn. */
function enclosingRadius(artwork: RgbaImage): number {
  const centreX = artwork.width / 2;
  const centreY = artwork.height / 2;
  let radius = 0;
  for (let y = 0; y < artwork.height; y += 1) {
    for (let x = 0; x < artwork.width; x += 1) {
      if (artwork.data[(y * artwork.width + x) * 4 + 3] <= 8) continue;
      const distance = Math.hypot(x + 0.5 - centreX, y + 0.5 - centreY);
      if (distance > radius) radius = distance;
    }
  }
  return radius;
}

function renderIcon(artwork: RgbaImage, radius: number, size: number, fit: Fit): RgbaImage {
  const scale =
    fit.type === "box"
      ? (size * fit.fraction) / Math.max(artwork.width, artwork.height)
      : (size * fit.fraction) / (radius * 2);

  const width = Math.max(1, Math.round(artwork.width * scale));
  const height = Math.max(1, Math.round(artwork.height * scale));

  const canvas = createCanvas(size, size, BACKGROUND);
  compositeOver(canvas, resize(artwork, width, height), Math.round((size - width) / 2), Math.round((size - height) / 2));
  return canvas;
}

/**
 * Renders the whole icon set in memory, keyed by project-relative path.
 * Exported so tests can assert the committed files still match the source logo.
 */
export async function renderIconSet(): Promise<Map<string, Buffer>> {
  const source = decodePng(await readFile(SOURCE_LOGO));
  // The source logo is padded with transparent margin and is not vertically
  // centred, so trim to the artwork before deciding how to frame each icon.
  const artwork = crop(source, contentBounds(source));
  const radius = enclosingRadius(artwork);

  const files = new Map<string, Buffer>();
  for (const icon of PNG_ICONS) {
    files.set(icon.file, encodePng(renderIcon(artwork, radius, icon.size, icon.fit)));
  }
  files.set(FAVICON_FILE, encodeIco(FAVICON_SIZES.map((size) => renderIcon(artwork, radius, size, FAVICON_FIT))));
  return files;
}

async function main(): Promise<void> {
  const files = await renderIconSet();
  for (const [file, contents] of files) {
    const target = join(projectRoot, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
    console.log(`  ${relative(projectRoot, target)} (${(contents.length / 1024).toFixed(1)} kB)`);
  }
}

// Only write files when invoked as a script, so importing this stays side-effect free.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
