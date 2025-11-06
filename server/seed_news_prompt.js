/**
 * Seed script to add news_curation system prompt
 * This allows Super Admins to view and modify the news API query logic
 * 
 * Run: cd server && node ../TEMP_FILES/seed_news_prompt.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Seeding news_curation system prompt...');
    
    const newsPrompt = await prisma.systemPrompt.upsert({
      where: { name: 'news_curation' },
      create: {
        name: 'news_curation',
        description: 'Controls how user preferences are applied when fetching curated news articles from NewsAPI.ai',
        content: `# News Curation API Configuration

This system prompt documents how user preferences are applied when fetching news articles.

## User Preferences Applied:

1. **Keywords** (settings.keywords): Comma-separated keywords that define content interests
   - Priority: HIGH
   - Used in: Article title and body keyword matching
   - Max keywords used: 10 (to stay under API limit of 15)

2. **Industry** (settings.industry): User's industry focus
   - Priority: HIGHEST
   - Used in: Primary keyword matching in article title/body
   - Always included if set

3. **News Categories** (settings.newsCategories): Array of category URIs
   - Examples: dmoz/Business, dmoz/Computers, dmoz/Science, news/Finance
   - Used in: categoryUri filter with $or logic
   - Applied as: { categoryUri: { $or: [...selected categories] } }

4. **News Languages** (settings.newsLanguages): Array of ISO 639-3 language codes
   - Examples: eng (English), spa (Spanish), fra (French)
   - Used in: lang filter
   - Falls back to englishVariant mapping if not specified

5. **News Sources** (settings.newsSources): Array of source URIs
   - Examples: bbc.com, cnn.com, reuters.com
   - Used in: sourceUri filter with $in operator
   - Applied as: { sourceUri: { $in: [...selected sources] } }

6. **News Countries** (settings.newsCountries): Array of country codes
   - Examples: usa, gbr, can, aus
   - Used in: sourceLocationUri filter
   - Applied as: sourceLocationUri array mapped to Wikipedia URIs

## Query Building Logic:

The query uses OR logic for keywords (industry + user keywords) to maximize relevance while allowing diverse results.

If no keywords are specified, defaults to: "business OR technology"

## API Limits:
- Max keyword conditions: 10 (to stay under NewsAPI.ai limit of 15)
- Articles per request: 7
- Article body length: 300 characters

## Troubleshooting:
- If users report irrelevant articles, check their keywords and industry settings
- If no articles returned, check that at least one keyword is set
- Categories and sources are optional filters that narrow results`,
        isActive: true
      },
      update: {
        description: 'Controls how user preferences are applied when fetching curated news articles from NewsAPI.ai',
        // Don't update content on re-run to preserve any manual edits
      }
    });
    
    console.log('✓ Successfully seeded news_curation system prompt');
    console.log('  ID:', newsPrompt.id);
    console.log('  Status:', newsPrompt.isActive ? 'Active' : 'Inactive');
    console.log('\nYou can now view and edit this in Super Admin Settings panel.');
    
  } catch (error) {
    console.error('Error seeding system prompt:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
