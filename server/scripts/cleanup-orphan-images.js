require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const IMAGES_DIR = path.join(__dirname, '../public/images/articles');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`Orphan image cleanup — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Get all image URLs referenced by articles
  const articles = await prisma.article.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true, slug: true },
  });

  const referencedFiles = new Set();
  for (const a of articles) {
    if (a.imageUrl?.startsWith('/images/articles/')) {
      referencedFiles.add(path.basename(a.imageUrl));
    }
  }

  console.log(`DB references ${referencedFiles.size} unique image files`);

  // List files on disk
  const diskFiles = await fs.readdir(IMAGES_DIR);
  console.log(`Disk has ${diskFiles.length} image files\n`);

  // Phase 1: Delete orphans (files not referenced by any article)
  const orphans = diskFiles.filter(f => !referencedFiles.has(f));
  console.log(`Found ${orphans.length} orphaned files to delete`);

  let deleted = 0;
  for (const file of orphans) {
    if (!DRY_RUN) {
      await fs.unlink(path.join(IMAGES_DIR, file));
    }
    deleted++;
  }
  console.log(`${DRY_RUN ? 'Would delete' : 'Deleted'}: ${deleted} orphan files\n`);

  // Phase 2: Rename referenced files to SEO-friendly names (strip timestamp + random suffix)
  let renamed = 0;
  for (const article of articles) {
    if (!article.imageUrl?.startsWith('/images/articles/')) continue;

    const currentFilename = path.basename(article.imageUrl);
    // Strip the 5-char random suffix and timestamp from filename
    // Pattern: slug-XXXXX-TIMESTAMP.ext → slug.ext
    const seoFilename = currentFilename
      .replace(/-[a-z0-9]{5}-\d{13}\.(png|jpg)$/, '.$1')
      .replace(/-\d{13}\.(png|jpg)$/, '.$1');

    if (seoFilename === currentFilename) continue;

    const oldPath = path.join(IMAGES_DIR, currentFilename);
    const newPath = path.join(IMAGES_DIR, seoFilename);
    const newUrl = `/images/articles/${seoFilename}`;

    try {
      await fs.access(oldPath);
    } catch {
      continue; // file doesn't exist on disk
    }

    if (!DRY_RUN) {
      await fs.rename(oldPath, newPath);
      await prisma.article.update({
        where: { id: article.id },
        data: { imageUrl: newUrl },
      });
    }
    renamed++;
    if (renamed <= 5) {
      console.log(`  ${currentFilename} → ${seoFilename}`);
    }
  }
  if (renamed > 5) console.log(`  ... and ${renamed - 5} more`);
  console.log(`\n${DRY_RUN ? 'Would rename' : 'Renamed'}: ${renamed} files for SEO`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
