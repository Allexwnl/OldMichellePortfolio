import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
await mkdir('.preview', { recursive: true });
for (const file of await readdir('img')) {
  if (!file.endsWith('.png')) continue;
  await sharp(`img/${file}`, { limitInputPixels: 300000000 }).flatten({ background: 'white' })
    .resize({ width: 1500, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(`.preview/${file}.jpg`);
}
