// Format/size optimization only; artwork is generated with the built-in image tool.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.ABCLUB_SHARP_MODULE || 'sharp');
const [communitySource, brandSource] = process.argv.slice(2);
if (!communitySource || !brandSource) throw new Error('Pass the two generated source image paths.');
const root = path.resolve(__dirname, '..');
const assets = [
  { source: communitySource, path: '/assets/community/european-classical-terrace.jpg', width: 1200, height: 500, quality: 65, alt: '欧洲古典湖畔别墅拱廊与艺术沙龙，品牌氛围配图' },
  { source: brandSource, path: '/assets/brand/ab-club-brand-share.jpg', width: 600, height: 480, quality: 84, alt: 'AB Club：你的名片，连接世界。数字名片、个性表达、全球华人。' },
];
(async () => {
  for (const asset of assets) {
    const target = path.join(root, 'miniprogram', asset.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await sharp(asset.source).resize(asset.width, asset.height, { fit: 'cover' }).jpeg({ quality: asset.quality, mozjpeg: true }).toFile(target);
    const data = fs.readFileSync(target);
    console.log(JSON.stringify({ path: asset.path, width: asset.width, height: asset.height, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') }));
  }
})();
