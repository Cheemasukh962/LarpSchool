/**
 * Resize saved LinkedIn avatars into small webp files named by luma id.
 *
 * Naming by id means the client can build a photo URL from a card with no slug lookup:
 *   /photos/usr-jeF9q6KuOWU6ENF.webp
 *
 * Source of truth is data/linkedin-photos-manifest.json (status === "saved").
 * Venue wifi is the binding constraint, so these are deliberately tiny.
 */
import { readFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST = path.join(ROOT, "data", "linkedin-photos-manifest.json");
const OUT_DIR = path.join(ROOT, "public", "photos");
const SIZE = 160;
const QUALITY = 72;

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const photos = manifest.photos ?? {};
  await mkdir(OUT_DIR, { recursive: true });

  let done = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;
  const manifestOut = {};

  const entries = Object.entries(photos);
  for (const [lumaId, entry] of entries) {
    if (entry?.status !== "saved" || !entry?.photo_file) {
      skipped++;
      continue;
    }

    // Manifest stores Windows-style paths; normalize so this runs anywhere.
    const src = path.join(ROOT, entry.photo_file.split(/[\\/]/).join(path.sep));
    const dest = path.join(OUT_DIR, `${lumaId}.webp`);

    let srcStat;
    try {
      srcStat = await stat(src);
    } catch {
      missing++;
      continue;
    }

    try {
      const destStat = await stat(dest).catch(() => null);
      if (destStat && destStat.mtimeMs > srcStat.mtimeMs) {
        manifestOut[lumaId] = `${lumaId}.webp`;
        skipped++;
        continue;
      }

      await sharp(src)
        .resize(SIZE, SIZE, { fit: "cover", position: "top" })
        .webp({ quality: QUALITY })
        .toFile(dest);

      manifestOut[lumaId] = `${lumaId}.webp`;
      done++;
    } catch (err) {
      failed++;
      console.warn(`  fail ${lumaId}: ${err.message}`);
    }
  }

  await writeFile(
    path.join(ROOT, "public", "data", "photos.json"),
    JSON.stringify({ size: SIZE, count: Object.keys(manifestOut).length, photos: manifestOut }),
    "utf8"
  );

  const files = await readdir(OUT_DIR);
  let bytes = 0;
  for (const f of files) bytes += (await stat(path.join(OUT_DIR, f))).size;

  console.log(`converted ${done}, reused ${skipped}, missing ${missing}, failed ${failed}`);
  console.log(`public/photos: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB at ${SIZE}px`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
