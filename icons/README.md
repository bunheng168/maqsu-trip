# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

You can use online tools to generate these icons:

1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/

## Icon Requirements

- Format: PNG
- Square aspect ratio (1:1)
- Transparent background recommended
- Should represent your app (e.g., travel/calendar icon)
- Minimum size: 512x512px (for generating all sizes)

## Quick Generate with ImageMagick (if installed)

If you have a source image (e.g., `icon-source.png` at 512x512), you can generate all sizes:

```bash
mkdir -p icons
convert icon-source.png -resize 72x72 icons/icon-72x72.png
convert icon-source.png -resize 96x96 icons/icon-96x96.png
convert icon-source.png -resize 128x128 icons/icon-128x128.png
convert icon-source.png -resize 144x144 icons/icon-144x144.png
convert icon-source.png -resize 152x152 icons/icon-152x152.png
convert icon-source.png -resize 192x192 icons/icon-192x192.png
convert icon-source.png -resize 384x384 icons/icon-384x384.png
cp icon-source.png icons/icon-512x512.png
```

## Temporary Placeholder

For testing purposes, you can create simple colored square icons. The app will work without icons, but they're recommended for a better user experience.

