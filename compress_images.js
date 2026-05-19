const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const REPO = 'yousefelsayed836-a11y/salmabehery1';
const IMAGES_DIR = path.join(__dirname, 'images');

const images = [
  { name: '1779148082408-be6u74.jpg', sha: '1cc35d27a777e6f312e260f6866b37b49f82a506', size: 37273 },
  { name: '1779148140397-9cq50k.jpg', sha: '1cc35d27a777e6f312e260f6866b37b49f82a506', size: 37273 },
  { name: '1779148161227-u4gabu.jpg', sha: 'cfa938eee0a20d9b56de5912d42a36404c87b43d', size: 5409550 },
  { name: '1779148203721-oa5s89.jpg', sha: '3e2862feb5d67be1c62823b4fc8d216c7ad86e90', size: 3243155 },
  { name: '1779148313280-yryty3.jpg', sha: '7db43ce20cd4dce5b896f9dea0397cfe597fc846', size: 3826959 },
  { name: '1779148341692-kdhi7c.jpg', sha: '37ede6b0c52994b59f8818099af4209c08e66858', size: 3798044 },
  { name: '1779148371881-0t84q3.jpg', sha: '7db43ce20cd4dce5b896f9dea0397cfe597fc846', size: 3826959 },
  { name: '1779148399520-tvpefu.jpg', sha: '635e31d517cef9c416a680a18873df92f3c7c5a4', size: 4074801 },
  { name: '1779149004999-g43nvm.jpg', sha: '1cc35d27a777e6f312e260f6866b37b49f82a506', size: 37273 },
  { name: '1779150953325-4z0nk6.jpg', sha: 'cc7cc14f957336677da8fb639b1150d85a312ffe', size: 3926469 },
  { name: '1779150985079-0ea3hy.jpg', sha: '37ede6b0c52994b59f8818099af4209c08e66858', size: 3798044 },
  { name: '1779151039690-er9w8j.jpg', sha: '635e31d517cef9c416a680a18873df92f3c7c5a4', size: 4074801 },
  { name: '1779151086620-t37f9c.jpg', sha: '7db43ce20cd4dce5b896f9dea0397cfe597fc846', size: 3826959 },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'compress-script' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function run() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Track unique SHAs to avoid re-downloading same content
  const processed = new Map(); // sha -> compressed buffer

  for (const img of images) {
    const outPath = path.join(IMAGES_DIR, img.name);

    // Skip small images (already small, no need to compress)
    if (img.size < 100000) {
      console.log(`⏭️  Skip ${img.name} (${(img.size/1024).toFixed(0)}KB — already small)`);
      continue;
    }

    try {
      let compressed;
      if (processed.has(img.sha)) {
        compressed = processed.get(img.sha);
        console.log(`♻️  Reuse compressed buffer for ${img.name}`);
      } else {
        console.log(`⬇️  Downloading ${img.name} (${(img.size/1024/1024).toFixed(1)}MB)...`);
        const url = `https://api.github.com/repos/${REPO}/git/blobs/${img.sha}`;
        const blobRes = await fetchBuffer(url);
        const blob = JSON.parse(blobRes.toString());
        const rawBuf = Buffer.from(blob.content.replace(/\n/g, ''), 'base64');

        console.log(`🗜️  Compressing...`);
        compressed = await sharp(rawBuf)
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        processed.set(img.sha, compressed);
      }

      fs.writeFileSync(outPath, compressed);
      console.log(`✅ ${img.name}: ${(img.size/1024).toFixed(0)}KB → ${(compressed.length/1024).toFixed(0)}KB (${Math.round((1 - compressed.length/img.size)*100)}% smaller)\n`);
    } catch (e) {
      console.error(`❌ Failed ${img.name}:`, e.message);
    }
  }

  console.log('\n🎉 Done! Now run: git add images/ && git commit -m "perf: compress existing images to WebP" && push');
}

run();
