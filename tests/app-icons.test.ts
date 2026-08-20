import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { renderIconSet } from "../scripts/generate-app-icons";
import { decodePng, type RgbaImage } from "../scripts/lib/png";

const projectRoot = join(new URL("..", import.meta.url).pathname);
const MASKABLE_SAFE_FRACTION = 0.8;

const read = (file: string) => readFileSync(join(projectRoot, file));
const readIcon = (file: string) => decodePng(read(file));

/** Icons sit on a solid plate, so anything that is not the plate is artwork. */
const isArtwork = (image: RgbaImage, index: number) =>
  image.data[index] < 245 || image.data[index + 1] < 245 || image.data[index + 2] < 245;

function artworkRadiusFraction(image: RgbaImage): number {
  const centre = image.width / 2;
  let radius = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!isArtwork(image, (y * image.width + x) * 4)) continue;
      const distance = Math.hypot(x + 0.5 - centre, y + 0.5 - centre);
      if (distance > radius) radius = distance;
    }
  }
  return radius / centre;
}

function artworkCoverage(image: RgbaImage): number {
  let painted = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (isArtwork(image, i)) painted += 1;
  }
  return painted / (image.width * image.height);
}

function isFullyOpaque(image: RgbaImage): boolean {
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 255) return false;
  }
  return true;
}

/** Reads the frame sizes out of an .ico directory. */
function icoFrameSizes(file: Buffer): number[] {
  const count = file.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => file[6 + index * 16] || 256);
}

describe("app icons", () => {
  it("declares manifest icons that exist at their advertised size", () => {
    const icons = manifest().icons ?? [];
    expect(icons.length).toBeGreaterThan(0);

    for (const icon of icons) {
      expect(icon.src.startsWith("/")).toBe(true);
      const image = readIcon(join("public", icon.src));
      expect(icon.type).toBe("image/png");
      expect(`${image.width}x${image.height}`).toBe(icon.sizes);
    }
  });

  it("ships both a plain and a maskable icon for every manifest size", () => {
    const icons = manifest().icons ?? [];
    const purposes = new Map<string, string[]>();
    for (const icon of icons) {
      purposes.set(icon.sizes ?? "", [...(purposes.get(icon.sizes ?? "") ?? []), String(icon.purpose)]);
    }

    expect([...purposes.keys()].sort()).toEqual(["192x192", "512x512"]);
    for (const declared of purposes.values()) {
      expect(declared.sort()).toEqual(["any", "maskable"]);
    }
  });

  it("keeps maskable artwork inside the safe circle launchers may crop to", () => {
    for (const icon of (manifest().icons ?? []).filter((entry) => entry.purpose === "maskable")) {
      const image = readIcon(join("public", icon.src));
      expect(artworkRadiusFraction(image)).toBeLessThanOrEqual(MASKABLE_SAFE_FRACTION);
    }
  });

  it("fills plain icons more tightly than maskable ones without overflowing", () => {
    const plain = readIcon("public/icons/icon-512.png");
    const maskable = readIcon("public/icons/icon-maskable-512.png");

    expect(artworkCoverage(plain)).toBeGreaterThan(artworkCoverage(maskable));
    // Guards against the artwork being clipped by the icon edge.
    expect(artworkRadiusFraction(plain)).toBeLessThan(Math.SQRT2);
    // Guards against an icon that is mostly empty padding.
    expect(artworkCoverage(maskable)).toBeGreaterThan(0.1);
  });

  it("renders opaque icons, as maskable icons and iOS require", () => {
    for (const file of [
      "public/icons/icon-192.png",
      "public/icons/icon-512.png",
      "public/icons/icon-maskable-192.png",
      "public/icons/icon-maskable-512.png",
      "src/app/apple-icon.png"
    ]) {
      expect(isFullyOpaque(readIcon(file)), `${file} must not be transparent`).toBe(true);
    }
  });

  it("ships a 180px apple touch icon", () => {
    const image = readIcon("src/app/apple-icon.png");
    expect([image.width, image.height]).toEqual([180, 180]);
  });

  it("ships a multi-size favicon", () => {
    expect(icoFrameSizes(read("src/app/favicon.ico"))).toEqual([16, 32, 48]);
  });

  it("matches a fresh render from the source logo", async () => {
    const rendered = await renderIconSet();
    expect(rendered.size).toBeGreaterThan(0);

    for (const [file, contents] of rendered) {
      expect(read(file).equals(contents), `${file} is stale — run \`npm run icons:generate\``).toBe(true);
    }
  });
});
