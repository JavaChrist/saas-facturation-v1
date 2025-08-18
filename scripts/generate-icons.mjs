#!/usr/bin/env node

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration des tailles d'icônes
const ICON_SIZES = {
  // Favicons standard
  favicon: [16, 32, 48],
  // PWA Android
  android: [192, 512],
  // PWA iOS
  ios: [152, 167, 180],
  // Autres tailles PWA
  pwa: [64, 96, 128, 256, 384]
};

// Image source
const SOURCE_IMAGE = path.join(__dirname, '..', 'public', 'logo.png');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function generateIcons() {
  try {
    console.log('🎨 Génération des icônes PWA...');
    
    // Vérifier que l'image source existe
    await fs.access(SOURCE_IMAGE);
    console.log('✅ Image source trouvée:', SOURCE_IMAGE);
    
    // Générer les favicons
    for (const size of ICON_SIZES.favicon) {
      const outputPath = path.join(PUBLIC_DIR, `logo${size}.png`);
      await sharp(SOURCE_IMAGE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Généré: logo${size}.png`);
    }
    
    // Générer le favicon.ico (multi-résolution)
    console.log('🔧 Génération du favicon.ico...');
    await sharp(SOURCE_IMAGE)
      .resize(32, 32)
      .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
    console.log('✅ Généré: favicon.ico');
    
    // Générer les icônes Android PWA
    for (const size of ICON_SIZES.android) {
      const outputPath = path.join(PUBLIC_DIR, `logo${size}.png`);
      await sharp(SOURCE_IMAGE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Généré: logo${size}.png`);
    }
    
    // Générer les icônes Apple Touch
    for (const size of ICON_SIZES.ios) {
      const outputPath = path.join(PUBLIC_DIR, `apple-touch-icon-${size}.png`);
      await sharp(SOURCE_IMAGE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Généré: apple-touch-icon-${size}.png`);
    }
    
    // Générer l'icône Apple Touch par défaut
    await sharp(SOURCE_IMAGE)
      .resize(180, 180)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
    console.log('✅ Généré: apple-touch-icon.png');
    
    // Générer les autres tailles PWA
    for (const size of ICON_SIZES.pwa) {
      const outputPath = path.join(PUBLIC_DIR, `logo${size}.png`);
      await sharp(SOURCE_IMAGE)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Généré: logo${size}.png`);
    }
    
    // Générer une version 3D stylisée pour iOS (avec ombre et relief)
    console.log('🎨 Génération de l\'icône 3D pour iOS...');
    const icon3dBuffer = await sharp(SOURCE_IMAGE)
      .resize(180, 180)
      .composite([
        {
          input: Buffer.from(
            `<svg width="180" height="180">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:white;stop-opacity:0.2" />
                  <stop offset="100%" style="stop-color:black;stop-opacity:0.2" />
                </linearGradient>
                <filter id="shadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feFlood flood-color="#000000" flood-opacity="0.3"/>
                  <feComposite in2="offsetblur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect width="180" height="180" fill="url(#grad)" rx="40" filter="url(#shadow)"/>
            </svg>`
          ),
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();
      
    await fs.writeFile(path.join(PUBLIC_DIR, 'apple-touch-icon-3d.png'), icon3dBuffer);
    console.log('✅ Généré: apple-touch-icon-3d.png');
    
    console.log('\n✨ Génération des icônes terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

// Exécuter la génération
generateIcons();