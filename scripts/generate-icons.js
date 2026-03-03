import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/favicon.svg');
const svgData = readFileSync(svgPath, 'utf-8');

for (const size of [192, 512]) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = resolve(__dirname, `../public/pwa-${size}x${size}.png`);
  writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${outPath}`);
}
