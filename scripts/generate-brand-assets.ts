import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function main() {
  const brandDir = path.join(process.cwd(), 'gateway', 'static', 'brand');
  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  // 1. Generate crisp 256x256 PNG for web badges & avatars
  const logoPath = path.join(process.cwd(), 'gateway', 'static', 'logo.png');
  const buf256 = await sharp(logoPath)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDir, 'logo-icon-256.png'), buf256);

  const base64Png = buf256.toString('base64');
  const dataUri = `data:image/png;base64,${base64Png}`;

  // 2. Standalone SVG Logo
  const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Playsole One Logo</title>
  <image href="${dataUri}" width="256" height="256"/>
</svg>
`;
  fs.writeFileSync(path.join(process.cwd(), 'gateway', 'static', 'logo.svg'), svgLogo);
  fs.writeFileSync(path.join(brandDir, 'logo.svg'), svgLogo);

  // 3. Pre-rendered Dark Sign-in Badge SVG (height 44, width 210)
  const darkBtnSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="44" viewBox="0 0 210 44">
  <style>
    .btn-bg { fill: #0f172a; rx: 22px; transition: fill 0.15s ease; }
    .btn-border { fill: none; stroke: rgba(255, 255, 255, 0.16); stroke-width: 1px; rx: 22px; }
    .btn-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; fill: #f8fafc; }
    a:hover .btn-bg { fill: #1e293b; }
  </style>
  <rect class="btn-bg" width="210" height="44"/>
  <rect class="btn-border" width="210" height="44"/>
  <g transform="translate(14, 10)">
    <image href="${dataUri}" width="24" height="24"/>
  </g>
  <text class="btn-text" x="48" y="27">Sign in with Playsole</text>
</svg>
`;
  fs.writeFileSync(path.join(brandDir, 'btn-signin-dark.svg'), darkBtnSvg);

  // 4. Pre-rendered Light Sign-in Badge SVG
  const lightBtnSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="44" viewBox="0 0 210 44">
  <style>
    .btn-bg { fill: #ffffff; rx: 22px; }
    .btn-border { fill: none; stroke: #cbd5e1; stroke-width: 1px; rx: 22px; }
    .btn-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; fill: #0f172a; }
    a:hover .btn-bg { fill: #f8fafc; }
  </style>
  <rect class="btn-bg" width="210" height="44"/>
  <rect class="btn-border" width="210" height="44"/>
  <g transform="translate(14, 10)">
    <image href="${dataUri}" width="24" height="24"/>
  </g>
  <text class="btn-text" x="48" y="27">Sign in with Playsole</text>
</svg>
`;
  fs.writeFileSync(path.join(brandDir, 'btn-signin-light.svg'), lightBtnSvg);

  // 5. Official drop-in CSS stylesheet for external buttons
  const css = `/* Playsole One Official Sign-in Button Styles */
.playsole-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 44px;
  padding: 0 20px 0 16px;
  border-radius: 9999px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
  box-sizing: border-box;
}
.playsole-btn .playsole-btn-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}
.playsole-btn-primary {
  background: #0076FE;
  color: #ffffff;
  border-color: #0076FE;
  box-shadow: 0 1px 3px rgba(0, 118, 254, 0.25);
}
.playsole-btn-primary:hover {
  background: #0060d0;
  border-color: #0060d0;
  box-shadow: 0 4px 14px rgba(0, 118, 254, 0.35);
  transform: translateY(-1px);
}
.playsole-btn-dark {
  background: #0f172a;
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.playsole-btn-dark:hover {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}
.playsole-btn-light {
  background: #ffffff;
  color: #0f172a;
  border-color: #cbd5e1;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.playsole-btn-light:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  transform: translateY(-1px);
}
.playsole-btn:active {
  transform: scale(0.985);
}
`;
  fs.writeFileSync(path.join(brandDir, 'signin-button.css'), css);

  console.log('Successfully generated public brand assets in gateway/static/brand');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
