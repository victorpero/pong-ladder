/**
 * Minimal dependency-free PNG toolkit used by the icon generator.
 *
 * Only what the icon pipeline needs: decode an 8-bit PNG to RGBA, resample it,
 * compose it onto a canvas, and write PNG/ICO back out. Everything works on
 * straight (non-premultiplied) RGBA; the resampler premultiplies internally so
 * soft logo edges do not pick up a halo from fully transparent pixels.
 */
import { deflateSync, inflateSync } from "node:zlib";

export type RgbaImage = {
  width: number;
  height: number;
  /** Row-major RGBA, 4 bytes per pixel, straight alpha. */
  data: Uint8ClampedArray;
};

export type Rgba = readonly [number, number, number, number];

export type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS_BY_COLOR_TYPE: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(file: Buffer): RgbaImage {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (file[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Not a PNG file");
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let paletteAlpha: Buffer | null = null;
  const idat: Buffer[] = [];

  let offset = 8;
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "tRNS") {
      paletteAlpha = Buffer.from(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth ${bitDepth}; expected 8`);
  }
  if (interlace !== 0) {
    throw new Error("Interlaced PNGs are not supported");
  }
  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG color type ${colorType}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Reverse the per-scanline filters (PNG spec 9.2) into a flat pixel buffer.
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const priorStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[priorStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[priorStart + x - channels] : 0;
      let restored: number;
      switch (filter) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + up;
          break;
        case 3:
          restored = value + ((left + up) >> 1);
          break;
        case 4:
          restored = value + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter type ${filter}`);
      }
      pixels[rowStart + x] = restored & 0xff;
    }
    rawOffset += stride;
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const source = i * channels;
    const target = i * 4;
    if (colorType === 6) {
      data[target] = pixels[source];
      data[target + 1] = pixels[source + 1];
      data[target + 2] = pixels[source + 2];
      data[target + 3] = pixels[source + 3];
    } else if (colorType === 2) {
      data[target] = pixels[source];
      data[target + 1] = pixels[source + 1];
      data[target + 2] = pixels[source + 2];
      data[target + 3] = 255;
    } else if (colorType === 0) {
      data[target] = pixels[source];
      data[target + 1] = pixels[source];
      data[target + 2] = pixels[source];
      data[target + 3] = 255;
    } else if (colorType === 4) {
      data[target] = pixels[source];
      data[target + 1] = pixels[source];
      data[target + 2] = pixels[source];
      data[target + 3] = pixels[source + 1];
    } else {
      if (!palette) {
        throw new Error("Indexed PNG is missing its PLTE chunk");
      }
      const index = pixels[source];
      data[target] = palette[index * 3];
      data[target + 1] = palette[index * 3 + 1];
      data[target + 2] = palette[index * 3 + 2];
      data[target + 3] = paletteAlpha && index < paletteAlpha.length ? paletteAlpha[index] : 255;
    }
  }

  return { width, height, data };
}

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  const typeAndBody = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndBody), 0);
  return Buffer.concat([length, typeAndBody, crc]);
}

export function encodePng(image: RgbaImage): Buffer {
  // Icons on a solid plate have no transparency, so drop the alpha channel and
  // write plain RGB. Saves roughly a quarter of the bytes at identical quality.
  let opaque = true;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 255) {
      opaque = false;
      break;
    }
  }

  const channels = opaque ? 3 : 4;
  const stride = image.width * channels;
  const raw = Buffer.alloc(image.height * (stride + 1));
  for (let y = 0; y < image.height; y += 1) {
    const target = y * (stride + 1);
    raw[target] = 0; // filter: none — the deflate pass already handles these well.
    for (let x = 0; x < image.width; x += 1) {
      const source = (y * image.width + x) * 4;
      const destination = target + 1 + x * channels;
      raw[destination] = image.data[source];
      raw[destination + 1] = image.data[source + 1];
      raw[destination + 2] = image.data[source + 2];
      if (!opaque) {
        raw[destination + 3] = image.data[source + 3];
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = opaque ? 2 : 6; // color type: RGB or RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/**
 * Packs PNG frames into an .ico container. Every frame must be 256px or smaller.
 */
export function encodeIco(frames: RgbaImage[]): Buffer {
  const encoded = frames.map((frame) => {
    if (frame.width > 256 || frame.height > 256) {
      throw new Error("ICO frames must be at most 256x256");
    }
    return encodePng(frame);
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(16 * frames.length);
  let imageOffset = header.length + directory.length;
  frames.forEach((frame, index) => {
    const entry = index * 16;
    directory[entry] = frame.width === 256 ? 0 : frame.width;
    directory[entry + 1] = frame.height === 256 ? 0 : frame.height;
    directory[entry + 2] = 0; // palette size
    directory[entry + 3] = 0; // reserved
    directory.writeUInt16LE(1, entry + 4); // color planes
    // Byte 25 of a PNG is the IHDR colour type; encodePng drops alpha when it can.
    directory.writeUInt16LE(encoded[index][25] === 6 ? 32 : 24, entry + 6); // bits per pixel
    directory.writeUInt32LE(encoded[index].length, entry + 8);
    directory.writeUInt32LE(imageOffset, entry + 12);
    imageOffset += encoded[index].length;
  });

  return Buffer.concat([header, directory, ...encoded]);
}

export function createCanvas(width: number, height: number, color: Rgba): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = color[3];
  }
  return { width, height, data };
}

export function crop(image: RgbaImage, bounds: Bounds): RgbaImage {
  const data = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    const source = ((bounds.top + y) * image.width + bounds.left) * 4;
    data.set(image.data.subarray(source, source + bounds.width * 4), y * bounds.width * 4);
  }
  return { width: bounds.width, height: bounds.height, data };
}

/**
 * Area-average resampling. Each destination pixel averages every source pixel it
 * covers, weighted by overlap, which keeps fine logo detail readable at 16px.
 */
export function resize(image: RgbaImage, width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const scaleX = image.width / width;
  const scaleY = image.height / height;

  for (let y = 0; y < height; y += 1) {
    const top = y * scaleY;
    const bottom = (y + 1) * scaleY;
    const firstRow = Math.floor(top);
    const lastRow = Math.min(image.height, Math.ceil(bottom));

    for (let x = 0; x < width; x += 1) {
      const left = x * scaleX;
      const right = (x + 1) * scaleX;
      const firstColumn = Math.floor(left);
      const lastColumn = Math.min(image.width, Math.ceil(right));

      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let totalWeight = 0;

      for (let sourceY = firstRow; sourceY < lastRow; sourceY += 1) {
        const weightY = Math.min(bottom, sourceY + 1) - Math.max(top, sourceY);
        if (weightY <= 0) continue;
        for (let sourceX = firstColumn; sourceX < lastColumn; sourceX += 1) {
          const weightX = Math.min(right, sourceX + 1) - Math.max(left, sourceX);
          if (weightX <= 0) continue;
          const weight = weightX * weightY;
          const source = (sourceY * image.width + sourceX) * 4;
          const sourceAlpha = image.data[source + 3] / 255;
          // Weight colour by alpha so transparent pixels cannot tint the edges.
          red += image.data[source] * sourceAlpha * weight;
          green += image.data[source + 1] * sourceAlpha * weight;
          blue += image.data[source + 2] * sourceAlpha * weight;
          alpha += sourceAlpha * weight;
          totalWeight += weight;
        }
      }

      const target = (y * width + x) * 4;
      if (alpha > 0) {
        data[target] = red / alpha;
        data[target + 1] = green / alpha;
        data[target + 2] = blue / alpha;
      }
      data[target + 3] = totalWeight > 0 ? Math.round((alpha / totalWeight) * 255) : 0;
    }
  }

  return { width, height, data };
}

/** Draws `source` onto `target` at the given offset using source-over blending. */
export function compositeOver(target: RgbaImage, source: RgbaImage, offsetX: number, offsetY: number): void {
  for (let y = 0; y < source.height; y += 1) {
    const targetY = offsetY + y;
    if (targetY < 0 || targetY >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const targetX = offsetX + x;
      if (targetX < 0 || targetX >= target.width) continue;

      const sourceIndex = (y * source.width + x) * 4;
      const sourceAlpha = source.data[sourceIndex + 3] / 255;
      if (sourceAlpha === 0) continue;

      const targetIndex = (targetY * target.width + targetX) * 4;
      const targetAlpha = target.data[targetIndex + 3] / 255;
      const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

      for (let channel = 0; channel < 3; channel += 1) {
        const sourceValue = source.data[sourceIndex + channel];
        const targetValue = target.data[targetIndex + channel];
        target.data[targetIndex + channel] =
          (sourceValue * sourceAlpha + targetValue * targetAlpha * (1 - sourceAlpha)) / outAlpha;
      }
      target.data[targetIndex + 3] = Math.round(outAlpha * 255);
    }
  }
}

/**
 * Finds the artwork inside an image, ignoring a uniform border. Handles both a
 * transparent margin and a flat opaque one so the source logo can be swapped
 * without the icons silently gaining padding.
 */
export function contentBounds(image: RgbaImage): Bounds {
  const corner = (x: number, y: number) => {
    const index = (y * image.width + x) * 4;
    return [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]] as const;
  };

  const corners = [
    corner(0, 0),
    corner(image.width - 1, 0),
    corner(0, image.height - 1),
    corner(image.width - 1, image.height - 1)
  ];
  const transparentMargin = corners.every((pixel) => pixel[3] <= 8);
  const [backgroundRed, backgroundGreen, backgroundBlue] = corners[0];

  const isBackground = (index: number): boolean => {
    const alpha = image.data[index + 3];
    if (transparentMargin) {
      return alpha <= 8;
    }
    if (alpha < 250) {
      return false;
    }
    return (
      Math.abs(image.data[index] - backgroundRed) <= 6 &&
      Math.abs(image.data[index + 1] - backgroundGreen) <= 6 &&
      Math.abs(image.data[index + 2] - backgroundBlue) <= 6
    );
  };

  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (isBackground((y * image.width + x) * 4)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) {
    throw new Error("Source logo appears to be blank");
  }

  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
