const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const REPO = 'yousefelsayed836-a11y/salmabehery1';
const IMAGES_DIR = path.join(__dirname, '..', 'images');

// download_url from the GitHub listing (raw content, no auth needed for public repo)
const images = [
  { name: '1779148082408-be6u74.jpg', size: 37273 },
  { name: '1779148140397-9cq50k.jpg', size: 37273 },
  { name: '1779148161227-u4gabu.jpg', size: 5409550 },
  { name: '1779148203721-oa5s89.jpg', size: 3243155 },
  { name: '1779148313280-yryty3.jpg', size: 3826959 },
  { name: '1779148341692-kdhi7c.jpg', size: 3798044 },
  { name: '1779148371881-0t84q3.jpg', size: 3826959 },
  { name: '1779148399520-tvpefu.jpg', size: 4074801 },
  { name: '1779149004999-g43nvm.jpg', size: 37273 },
  { name: '1779150953325-4z0nk6.jpg', size: 3926469 },
  { name: '1779150985079-0ea3hy.jpg', size: 3798044 },
  { name: '1779151039690-er9w8j.jpg', size: 4074801 },
  { name: '1779151086620-t37f9c.jpg', size: 3826959 },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'compress-script' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Cache by original size group to skip re-downloading identical content
  const cache = new Map();

  for (const img of images) {
    const outPath = path.join(IMAGES_DIR, img.name);

    if (img.size < 100000) {
      console.log(`⏭️  Skip ${img.name} (${(img.size/1024).toFixed(0)}KB — already small)`);
      continue;
    }

    try {
      let compressed;
      if (cache.has(img.size)) {
        compressed = cache.get(img.size);
        console.log(`♻️  Reuse for ${img.name}`);
      } else {
        console.log(`⬇️  Downloading ${img.name} (${(img.size/1024/1024).toFixed(1)}MB)...`);
        const rawUrl = `https://raw.githubusercontent.com/${REPO}/main/images/${img.name}`;
        const rawBuf = await fetchBuffer(rawUrl);

        console.log(`🗜️  Compressing...`);
        compressed = await sharp(rawBuf)
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        cache.set(img.size, compressed);
      }

      fs.writeFileSync(outPath, compressed);
      const pct = Math.round((1 - compressed.length / img.size) * 100);
      console.log(`✅ ${img.name}: ${(img.size/1024).toFixed(0)}KB → ${(compressed.length/1024).toFixed(0)}KB (${pct}% smaller)\n`);
    } catch (e) {
      console.error(`❌ Failed ${img.name}:`, e.message);
    }
  }

  console.log('🎉 Done!');
}

run();
