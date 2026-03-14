#!/usr/bin/env node
/**
 * PropertyHack Duplicate Article Cleanup Script v2
 * 
 * Identifies and removes duplicate articles using multiple detection methods:
 * - Exact title duplicates
 * - URL path duplicates (cross-source syndication)
 * - Fuzzy title matches (>85% similarity)
 * 
 * For each duplicate group, keeps the OLDEST article (first ingested)
 * and marks the rest for deletion.
 * 
 * Usage:
 *   node cleanup-duplicates.js           # DRY RUN (recommended first)
 *   node cleanup-duplicates.js --execute # Actually delete duplicates
 * 
 * SAFETY: Always run without --execute first to review what will be deleted!
 */

const { PrismaClient } = require('@prisma/client');
const { normaliseText } = require('../utils/contentHash');
const { URL } = require('url');

const prisma = new PrismaClient();

/**
 * Calculate title similarity using word overlap (Jaccard similarity)
 * @param {string} a - First title (normalised)
 * @param {string} b - Second title (normalised) 
 * @returns {number} - Similarity ratio (0-1)
 */
function titleSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

/**
 * Group articles by exact title match
 */
function findExactTitleDuplicates(articles) {
  const titleGroups = new Map();
  
  for (const article of articles) {
    const normTitle = normaliseText(article.title);
    if (!titleGroups.has(normTitle)) {
      titleGroups.set(normTitle, []);
    }
    titleGroups.get(normTitle).push(article);
  }
  
  // Filter to only groups with multiple articles
  const duplicateGroups = [];
  for (const [title, group] of titleGroups) {
    if (group.length > 1) {
      duplicateGroups.push({
        type: 'exact_title',
        key: title,
        articles: group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Oldest first
      });
    }
  }
  
  return duplicateGroups;
}

/**
 * Group articles by URL path (cross-source syndication)
 */
function findUrlPathDuplicates(articles) {
  const pathGroups = new Map();
  
  for (const article of articles) {
    try {
      const parsed = new URL(article.sourceUrl);
      const path = parsed.pathname.replace(/\/$/, '');
      if (path) { // Only process non-empty paths
        if (!pathGroups.has(path)) {
          pathGroups.set(path, []);
        }
        pathGroups.get(path).push(article);
      }
    } catch {
      // Invalid URL, skip
      continue;
    }
  }
  
  // Filter to only paths with multiple articles from different domains
  const duplicateGroups = [];
  for (const [path, group] of pathGroups) {
    if (group.length > 1) {
      // Check if articles are from different domains (actual cross-source duplicates)
      const domains = new Set();
      for (const article of group) {
        try {
          const domain = new URL(article.sourceUrl).hostname;
          domains.add(domain);
        } catch {
          continue;
        }
      }
      
      if (domains.size > 1) { // Only include if multiple domains
        duplicateGroups.push({
          type: 'url_path',
          key: path,
          articles: group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Oldest first
        });
      }
    }
  }
  
  return duplicateGroups;
}

/**
 * Find articles with fuzzy title similarity >85%
 */
function findFuzzyTitleDuplicates(articles) {
  const duplicateGroups = [];
  const processed = new Set();
  
  console.log('  Performing fuzzy title matching...');
  
  for (let i = 0; i < articles.length; i++) {
    if (processed.has(articles[i].id)) continue;
    
    const group = [articles[i]];
    const baseTitle = normaliseText(articles[i].title);
    
    for (let j = i + 1; j < articles.length; j++) {
      if (processed.has(articles[j].id)) continue;
      
      const compareTitle = normaliseText(articles[j].title);
      const similarity = titleSimilarity(baseTitle, compareTitle);
      
      if (similarity > 0.85) {
        group.push(articles[j]);
        processed.add(articles[j].id);
      }
    }
    
    processed.add(articles[i].id);
    
    if (group.length > 1) {
      duplicateGroups.push({
        type: 'fuzzy_title',
        key: baseTitle,
        articles: group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Oldest first
      });
    }
    
    if (i % 100 === 0 && i > 0) {
      console.log(`    Processed ${i}/${articles.length} articles...`);
    }
  }
  
  return duplicateGroups;
}

/**
 * Generate detailed report for a duplicate group
 */
function formatDuplicateGroup(group, index) {
  const oldest = group.articles[0]; // Keep this one
  const duplicates = group.articles.slice(1); // Delete these
  
  let report = `\n--- Duplicate Group #${index + 1} (${group.type}) ---\n`;
  report += `Key: ${group.key.substring(0, 80)}${group.key.length > 80 ? '...' : ''}\n`;
  report += `Total articles: ${group.articles.length}\n`;
  report += `Articles to delete: ${duplicates.length}\n\n`;
  
  report += `🟢 KEEP (oldest): ${oldest.id}\n`;
  report += `   Title: ${oldest.title}\n`;
  report += `   Source: ${oldest.source?.name || 'Unknown'}\n`;
  report += `   Created: ${oldest.createdAt}\n`;
  report += `   URL: ${oldest.sourceUrl}\n\n`;
  
  for (const dup of duplicates) {
    report += `🔴 DELETE: ${dup.id}\n`;
    report += `   Title: ${dup.title}\n`;
    report += `   Source: ${dup.source?.name || 'Unknown'}\n`;
    report += `   Created: ${dup.createdAt}\n`;
    report += `   URL: ${dup.sourceUrl}\n\n`;
  }
  
  return { report, duplicateIds: duplicates.map(d => d.id) };
}

async function main() {
  console.log('PropertyHack Duplicate Article Cleanup v2');
  console.log('==========================================');
  
  const isExecuteMode = process.argv.includes('--execute');
  
  if (isExecuteMode) {
    console.log('⚠️  EXECUTE MODE: Duplicates will be PERMANENTLY DELETED!');
  } else {
    console.log('🔍 DRY RUN MODE: No articles will be deleted (pass --execute to delete)');
  }
  console.log('');
  
  // Fetch all articles with related data
  console.log('Fetching all articles...');
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      source: {
        select: { name: true }
      }
    }
  });
  
  console.log(`Total articles: ${articles.length}`);
  console.log('');
  
  // Find different types of duplicates
  console.log('1. Finding exact title duplicates...');
  const exactTitleDupes = findExactTitleDuplicates(articles);
  console.log(`   Found ${exactTitleDupes.length} exact title duplicate groups`);
  
  console.log('2. Finding URL path duplicates...');
  const urlPathDupes = findUrlPathDuplicates(articles);
  console.log(`   Found ${urlPathDupes.length} URL path duplicate groups`);
  
  console.log('3. Finding fuzzy title duplicates...');
  const fuzzyTitleDupes = findFuzzyTitleDuplicates(articles);
  console.log(`   Found ${fuzzyTitleDupes.length} fuzzy title duplicate groups`);
  
  // Combine all duplicate groups
  const allDuplicateGroups = [
    ...exactTitleDupes,
    ...urlPathDupes,
    ...fuzzyTitleDupes
  ];
  
  console.log('');
  console.log('DUPLICATE ANALYSIS SUMMARY');
  console.log('==========================');
  console.log(`Exact title duplicates: ${exactTitleDupes.length} groups`);
  console.log(`URL path duplicates: ${urlPathDupes.length} groups`);
  console.log(`Fuzzy title duplicates: ${fuzzyTitleDupes.length} groups`);
  console.log(`Total duplicate groups: ${allDuplicateGroups.length}`);
  
  // Calculate total articles to delete
  let totalDuplicateIds = new Set();
  let detailedReport = '';
  
  for (let i = 0; i < allDuplicateGroups.length; i++) {
    const group = allDuplicateGroups[i];
    const { report, duplicateIds } = formatDuplicateGroup(group, i);
    detailedReport += report;
    
    // Add to total (use Set to avoid counting same article multiple times)
    for (const id of duplicateIds) {
      totalDuplicateIds.add(id);
    }
  }
  
  const totalToDelete = totalDuplicateIds.size;
  const articlesAfterCleanup = articles.length - totalToDelete;
  
  console.log(`Total unique articles to delete: ${totalToDelete}`);
  console.log(`Articles remaining after cleanup: ${articlesAfterCleanup}`);
  console.log(`Space saved: ${((totalToDelete / articles.length) * 100).toFixed(1)}%`);
  console.log('');
  
  // Show detailed report if not too long, otherwise save to file
  if (allDuplicateGroups.length <= 10) {
    console.log('DETAILED DUPLICATE GROUPS:');
    console.log('===========================');
    console.log(detailedReport);
  } else {
    const fs = require('fs');
    const reportPath = './duplicate-cleanup-report.txt';
    fs.writeFileSync(reportPath, detailedReport);
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
  
  // Execute deletion if requested
  if (isExecuteMode && totalToDelete > 0) {
    console.log('');
    console.log('🚨 EXECUTING DELETION...');
    console.log(`Deleting ${totalToDelete} duplicate articles...`);
    
    try {
      const deleteResult = await prisma.article.deleteMany({
        where: {
          id: {
            in: Array.from(totalDuplicateIds)
          }
        }
      });
      
      console.log(`✅ Successfully deleted ${deleteResult.count} duplicate articles!`);
      console.log(`Remaining articles: ${articlesAfterCleanup}`);
      
    } catch (error) {
      console.error(`❌ Error during deletion: ${error.message}`);
      process.exit(1);
    }
    
  } else if (isExecuteMode && totalToDelete === 0) {
    console.log('✅ No duplicates found to delete!');
    
  } else {
    console.log('');
    console.log('To execute the cleanup, run:');
    console.log('node cleanup-duplicates.js --execute');
    console.log('');
    console.log('⚠️  WARNING: This will permanently delete the duplicate articles!');
    console.log('Review the duplicate groups above before executing.');
  }
  
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };