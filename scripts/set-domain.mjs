#!/usr/bin/env node
/**
 * Remplace l'espace réservé VOTRE-DOMAINE.com par votre vrai domaine
 * dans tous les fichiers concernés.
 *
 *   npm run domain -- premium-iptv.fr
 *
 * Relancez-le si vous changez de domaine : il remplace aussi un domaine
 * déjà appliqué (il retrouve celui présent dans public/sitemap.xml).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const FICHIERS = [
  'public/index.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/404.html'
];

let domaine = (process.argv[2] || '').trim();

if (!domaine) {
  console.error('\n  Usage :  npm run domain -- votredomaine.fr\n');
  process.exit(1);
}

// Nettoyage : on accepte https://www.exemple.fr/ et on garde exemple.fr
domaine = domaine
  .replace(/^https?:\/\//i, '')
  .replace(/^www\./i, '')
  .replace(/\/+$/, '')
  .toLowerCase();

if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+$/.test(domaine)) {
  console.error(`\n  ✗ « ${domaine} » ne ressemble pas à un domaine valide.\n`);
  process.exit(1);
}

// Détecte le domaine actuellement en place (pour pouvoir le remplacer à nouveau)
let actuel = 'VOTRE-DOMAINE.com';
const sitemap = join(racine, 'public/sitemap.xml');
if (existsSync(sitemap)) {
  const m = readFileSync(sitemap, 'utf8').match(/<loc>https:\/\/([^/<]+)\//);
  if (m && m[1]) { actuel = m[1]; }
}

if (actuel === domaine) {
  console.log(`\n  Le domaine est déjà « ${domaine} ». Rien à faire.\n`);
  process.exit(0);
}

let total = 0;
for (const rel of FICHIERS) {
  const chemin = join(racine, rel);
  if (!existsSync(chemin)) { console.warn(`  ! introuvable : ${rel}`); continue; }
  const avant = readFileSync(chemin, 'utf8');
  const apres = avant.split(actuel).join(domaine);
  const n = avant.split(actuel).length - 1;
  if (n > 0) { writeFileSync(chemin, apres, 'utf8'); }
  total += n;
  console.log(`  ${n > 0 ? '✓' : '·'} ${rel.padEnd(22)} ${n} remplacement${n > 1 ? 's' : ''}`);
}

console.log(`\n  ${total} remplacement(s) : ${actuel} → ${domaine}`);
console.log('  Pensez à committer puis pousser pour redéployer.\n');
