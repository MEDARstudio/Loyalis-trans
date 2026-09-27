import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  <!-- Carré orange vif avec coins légèrement arrondis pour une finition pro -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#orangeGrad)" />
  
  <!-- Typo LT en blanc ultra-bold, parfaitement centrée et très lisible même en 16x16 dans un onglet -->
  <text 
    x="256" 
    y="256" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
    font-size="250" 
    font-weight="900" 
    letter-spacing="-10" 
    fill="#ffffff" 
    text-anchor="middle" 
    dominant-baseline="central"
  >LT</text>
</svg>`;

async function generate() {
  const publicDir = path.resolve('public');
  const assetsDir = path.resolve('public/assets');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('✓ Created public/favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PNGs of various sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, dir: publicDir },
    { name: 'favicon-32x32.png', size: 32, dir: publicDir },
    { name: 'favicon.png', size: 64, dir: publicDir },
    { name: 'apple-touch-icon.png', size: 180, dir: publicDir },
    { name: 'icon-192.png', size: 192, dir: publicDir },
    { name: 'icon-512.png', size: 512, dir: publicDir },
    { name: 'logo.png', size: 512, dir: publicDir },
    { name: 'icon-192.png', size: 192, dir: assetsDir },
    { name: 'icon-512.png', size: 512, dir: assetsDir },
  ];

  for (const item of sizes) {
    const filePath = path.join(item.dir, item.name);
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(filePath);
    console.log(`✓ Created ${path.relative(process.cwd(), filePath)} (${item.size}x${item.size})`);
  }

  // 3. Generate favicon.ico (can be a 32x32 or 48x48 PNG or ICO format)
  // Sharp can write a 32x32 png as favicon.ico or multi-size png buffer
  const icoBuffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Created public/favicon.ico');

  console.log('All favicons successfully generated!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
