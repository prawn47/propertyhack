# Property Hack Transformation Plan

## Overview
Transform the current LinkedIn post management app into Property Hack - a property news aggregation and media platform with admin backend and public-facing news site.

## Architecture

### Two-Tier System

#### 1. Admin Backend (Protected)
- Admin users manage content (current auth system repurposed)
- Add/edit articles (manually or via API/RSS feeds)
- Generate AI summaries with focus keywords
- Generate images with meaningful alt text
- Review/approve auto-imported articles
- Manage sources, markets, and configuration

#### 2. Public Frontend (No Auth)
- Beautiful tile-based news display (masonry grid)
- Market-specific views (/au, /us, /uk, /ca)
- Article detail pages with SEO optimization
- Beehiiv newsletter subscription
- No login required for readers

## Database Schema Changes

### New Models

```prisma
model Article {
  id                String    @id @default(cuid())
  title             String
  slug              String    @unique // URL-friendly: "why-sydney-property-prices-soaring"
  summary           String    @db.Text // AI-generated rewrite/summary
  content           String?   @db.Text // Full content if available
  sourceUrl         String    // Original article URL
  sourceName        String    // e.g., "Domain", "realestate.com.au"
  sourceLogoUrl     String?   // Source publication logo
  
  // SEO fields
  metaDescription   String    @db.Text
  focusKeywords     String    // JSON array: ["sydney property", "housing market"]
  ogImage           String?   // Open Graph image
  
  // Image with alt text
  imageUrl          String?
  imageAltText      String?   // Descriptive alt text for SEO
  
  // Market
  market            String    // "AU", "US", "UK", "CA"
  
  // Status
  status            String    @default("draft") // "draft", "published", "archived"
  publishedAt       DateTime?
  
  // Relations
  authorId          String    @map("author_id")
  author            User      @relation(fields: [authorId], references: [id])
  
  sourceId          String?   @map("source_id")
  source            ArticleSource? @relation(fields: [sourceId], references: [id])
  
  categoryId        String?   @map("category_id")
  category          ArticleCategory? @relation(fields: [categoryId], references: [id])
  
  // Engagement
  viewCount         Int       @default(0)
  featured          Boolean   @default(false) // Featured articles get larger tiles
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([market])
  @@index([status])
  @@index([publishedAt])
  @@index([featured])
  @@map("articles")
}

model ArticleSource {
  id          String    @id @default(cuid())
  name        String    // "Domain", "realestate.com.au", "Property Observer"
  url         String    // Base URL
  logoUrl     String?
  
  // Feed configuration
  feedType    String    // "rss", "api", "manual"
  feedUrl     String?   // RSS feed URL or API endpoint
  apiKey      String?   // For API sources
  
  // Settings
  isActive    Boolean   @default(true)
  autoImport  Boolean   @default(false) // Auto-import or require approval
  market      String    // Primary market: "AU", "US", "UK", "CA"
  
  // Relations
  articles    Article[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("article_sources")
}

model ArticleCategory {
  id          String    @id @default(cuid())
  name        String    // "Market Analysis", "Investment Tips", "Policy Changes"
  slug        String    @unique
  description String?
  market      String    // "ALL" or specific market
  
  articles    Article[]
  
  @@map("article_categories")
}

model Market {
  id          String   @id @default(cuid())
  code        String   @unique // "AU", "US", "UK", "CA"
  name        String   // "Australia", "United States"
  currency    String   // "AUD", "USD"
  isActive    Boolean  @default(true)
  
  @@map("markets")
}
```

### Modified User Model
```prisma
// Repurpose User model for admin users only
model User {
  // Keep existing fields, add:
  role            String   @default("admin") // "admin", "super_admin"
  displayName     String?
  
  // Add relation to articles
  articles        Article[]
  
  // KEEP LinkedIn fields for posting articles to LinkedIn:
  // linkedinId, linkedinAccessToken, linkedinTokenExpiry, linkedinConnected
}
```

## Phase 1: Database & Backend Foundation

### 1.1 Update Prisma Schema
- Add new models (Article, ArticleSource, ArticleCategory, Market)
- Modify User model for admin-only access
- Run migrations
- Seed initial data (markets, categories)

### 1.2 Create Admin API Routes

**Article Management** (`server/routes/admin/articles.js`):
```
POST   /api/admin/articles              - Create article (draft)
GET    /api/admin/articles              - List all articles (with filters)
GET    /api/admin/articles/:id          - Get single article
PUT    /api/admin/articles/:id          - Update article
DELETE /api/admin/articles/:id          - Delete article
POST   /api/admin/articles/:id/publish  - Publish article
POST   /api/admin/articles/:id/generate-summary - Generate AI summary
POST   /api/admin/articles/:id/generate-image   - Generate image with alt text
```

**Source Management** (`server/routes/admin/sources.js`):
```
POST   /api/admin/sources               - Add source
GET    /api/admin/sources               - List sources
PUT    /api/admin/sources/:id           - Update source
DELETE /api/admin/sources/:id           - Delete source
POST   /api/admin/sources/:id/test      - Test RSS/API connection
POST   /api/admin/sources/:id/import    - Manual import from source
```

**Feed Ingestion** (`server/routes/admin/feeds.js`):
```
POST   /api/admin/feeds/fetch           - Manually trigger feed fetch
GET    /api/admin/feeds/pending         - Get articles pending review
POST   /api/admin/feeds/approve/:id     - Approve imported article
```

### 1.3 Create AI Services

**Summary Generation** (`server/services/summaryService.js`):
- Input: source URL, focus keywords, market
- Process: Fetch original content, use OpenAI/Gemini to create SEO-optimized summary
- Output: title, summary, metaDescription, slug
- Include instructions to reference source and link back

**Image Generation** (`server/services/imageService.js`):
- Input: article title/summary, admin's preferred style
- Generate relevant property image using DALL-E
- Create descriptive alt text using AI
- Output: imageUrl (base64 or uploaded), imageAltText

**Feed Parser** (`server/services/feedService.js`):
- Parse RSS feeds from configured sources
- Extract: title, link, description, pubDate
- Create draft articles for admin review

## Phase 2: Admin Dashboard UI

### 2.1 Admin Article Manager
Replace HomePage with ArticleManager component:
- List all articles (draft, published, archived)
- Filter by market, status, source
- Quick actions: edit, publish, archive, delete

### 2.2 Article Editor
Create ArticleEditor component (similar to DraftEditor):
- Rich text editor for summary
- URL input for source article
- Focus keywords input (for AI generation)
- Image upload or AI generation
  - Auto-generate alt text or manual edit
- Market selector
- Category picker
- SEO fields: slug, meta description
- Preview mode

### 2.3 Source Manager
Create SourceManager component:
- Add/edit sources
- Configure RSS feed URLs or API endpoints
- Test connection
- Enable/disable auto-import

### 2.4 Dashboard Home
Show quick stats:
- Articles published this week
- Top performing articles (by views)
- Pending review (from RSS feeds)
- Recent activity

## Phase 3: Public Frontend

### 3.1 Public Homepage (`/au`, `/us`, `/uk`, `/ca`)

**Layout**:
- Header with Property Hack logo
- Market selector dropdown (AU/US/UK/CA)
- Hero section with featured article (large tile)
- Masonry grid of article tiles (varying sizes)
- Beehiiv newsletter embed (sticky or footer)
- Footer with links

**Article Tiles**:
```tsx
interface ArticleTile {
  size: 'small' | 'medium' | 'large' | 'hero'
  title: string
  summary: string (truncated)
  imageUrl: string
  imageAltText: string
  sourceName: string
  publishedAt: Date
  slug: string
}
```

**Masonry Grid** using CSS Grid or Framer Motion:
- Responsive (mobile: 1 col, tablet: 2 cols, desktop: 3-4 cols)
- Featured articles: larger tiles
- Hover effects
- "Read More" CTA

**SEO Implementation**:
```tsx
<Helmet>
  <title>Property Hack AU - Latest Australian Property News</title>
  <meta name="description" content="Agenda-free property insights..." />
  <link rel="canonical" href="https://propertyhack.com/au" />
  <meta property="og:title" content="..." />
  <meta property="og:image" content="..." />
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": "...",
      "image": "...",
      "datePublished": "...",
      "author": {
        "@type": "Organization",
        "name": "Property Hack"
      }
    })}
  </script>
</Helmet>
```

### 3.2 Article Detail Page (`/au/:slug`)

**Components**:
- Hero image with alt text
- H1: Article title
- Published date, source attribution with link
- Article summary (styled content)
- "Read original article" CTA button
- Related articles sidebar
- Social share buttons
- Newsletter signup CTA

**SEO Structure**:
```html
<article>
  <header>
    <h1>Article Title</h1>
    <p class="byline">Source: <a href="...">Domain.com.au</a> | Published: Jan 15, 2025</p>
  </header>
  <img src="..." alt="Descriptive alt text for SEO" />
  <div class="article-content">
    <!-- Summary content with proper H2, H3 hierarchy -->
  </div>
  <footer>
    <a href="source-url" rel="noopener noreferrer">Read original article →</a>
  </footer>
</article>
```

### 3.3 Beehiiv Integration
Embed in footer or as floating CTA:
```tsx
<div id="beehiiv-embed">
  <script async src="https://subscribe-forms.beehiiv.com/embed.js"></script>
  <iframe 
    src="https://subscribe-forms.beehiiv.com/c45a12dd-0634-43ce-9745-ecbc0c6aaccf" 
    className="beehiiv-embed" 
    data-test-id="beehiiv-embed" 
    frameBorder="0" 
    scrolling="no" 
    style={{
      width: '560px',
      height: '315px',
      margin: 0,
      borderRadius: 0,
      backgroundColor: 'transparent'
    }}
  />
</div>

<!-- Attribution tracking -->
<script 
  type="text/javascript" 
  async 
  src="https://subscribe-forms.beehiiv.com/attribution.js"
/>
```

## Phase 4: Background Workers

### 4.1 RSS Feed Worker
Reuse existing BullMQ infrastructure:
- Schedule: Run every 4-6 hours
- Process: Fetch from all active sources
- Create draft articles or auto-publish (based on source config)
- Send notifications to admins for review

### 4.2 Analytics Worker (Future)
- Track article views
- Update viewCount field
- Generate reports

## Phase 5: Styling & Branding

### 5.1 Design System
Reference https://propertyhack.com/:
- Clean, modern typography
- White/light gray backgrounds
- Property Hack logo (you provided)
- Green accent color from newsletter brand
- Professional, editorial feel

### 5.2 Tailwind Config
Update colors:
```js
// tailwind.config.js
colors: {
  'ph-primary': '#...',    // From logo
  'ph-secondary': '#...',
  'ph-accent': '#...',
}
```

### 5.3 Responsive Grid
CSS Grid for masonry layout:
```css
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  grid-auto-rows: 200px;
}

.article-tile.large {
  grid-row: span 2;
  grid-column: span 2;
}
```

## Phase 6: SEO Implementation

### 6.1 Meta Tags Component
```tsx
interface SEOProps {
  title: string
  description: string
  image?: string
  url: string
  type?: 'website' | 'article'
  publishedTime?: string
  author?: string
}

const SEOHead: React.FC<SEOProps> = ({...}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={url} />
    
    {/* Open Graph */}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={image} />
    <meta property="og:url" content={url} />
    <meta property="og:type" content={type} />
    
    {/* Twitter */}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={image} />
    
    {/* Article specific */}
    {type === 'article' && publishedTime && (
      <meta property="article:published_time" content={publishedTime} />
    )}
  </Helmet>
)
```

### 6.2 Sitemap Generation
```
GET /sitemap.xml - Dynamic sitemap of all published articles
```

### 6.3 Robots.txt
```
User-agent: *
Allow: /
Disallow: /admin/
Sitemap: https://propertyhack.com/sitemap.xml
```

### 6.4 Structured Data
Include Article schema on every article page:
```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Article Title",
  "image": ["image-url"],
  "datePublished": "2025-01-15T08:00:00+00:00",
  "dateModified": "2025-01-15T09:20:00+00:00",
  "author": {
    "@type": "Organization",
    "name": "Property Hack"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Property Hack",
    "logo": {
      "@type": "ImageObject",
      "url": "https://propertyhack.com/logo.png"
    }
  },
  "description": "Meta description"
}
```

## Phase 7: Multi-Market Routing

### 7.1 Route Structure
```
/              → Redirect to /au (or detect location)
/au            → Australian property news
/us            → US property news
/uk            → UK property news
/ca            → Canadian property news
/au/:slug      → Article detail page
```

### 7.2 Market Detection
Option 1: Path-based (simpler, better SEO)
- Each market is a separate route
- User manually selects via dropdown

Option 2: Subdomain-based (future scaling)
- au.propertyhack.com
- us.propertyhack.com

### 7.3 Market Context
```tsx
const MarketContext = React.createContext<Market>('AU')

const MarketProvider = ({ children }) => {
  const location = useLocation()
  const market = location.pathname.split('/')[1].toUpperCase() || 'AU'
  
  return (
    <MarketContext.Provider value={market}>
      {children}
    </MarketContext.Provider>
  )
}
```

## Implementation Order

### Week 1: Foundation
1. Update database schema
2. Run migrations, seed data
3. Create admin article API routes
4. Build AI summary service

### Week 2: Admin Dashboard
5. Build ArticleEditor component
6. Build ArticleManager (list view)
7. Build SourceManager
8. Test article creation workflow

### Week 3: Public Frontend
9. Create public homepage with masonry grid
10. Build article detail page
11. Integrate Beehiiv newsletter
12. Implement SEO (meta tags, structured data)

### Week 4: Polish & Launch
13. Update branding/styling
14. Build RSS worker
15. Multi-market routing
16. Testing, deployment
17. Generate sitemap, configure robots.txt

## Key Considerations

### Reuse Existing Code
- Keep: User auth, Prisma setup, BullMQ workers, AI services (OpenAI/Gemini)
- **Keep: LinkedIn integration** - admins can post articles to LinkedIn for promotion
- Modify: Dashboard components → admin panels
- Replace: Landing page → public homepage

### Focus Keywords Workflow
When admin enters focus keywords (e.g., "sydney property market", "housing affordability"):
1. AI uses keywords to optimize summary for SEO
2. Keywords guide H2/H3 structure in summary
3. Meta description includes keywords
4. Alt text for images references keywords
5. Slug generation considers keywords

### Image Alt Text
Every generated/uploaded image must have descriptive alt text:
- "Aerial view of Sydney harbor with residential apartments in foreground"
- "Graph showing Melbourne property price trends from 2020-2025"
- Never: "image1.jpg" or "property photo"

### Source Attribution
Always prominent:
- Link to original article
- Source name and logo
- "Originally published on [Source]"
- No plagiarism - clear rewrites/summaries

## Technical Stack Summary

**Frontend**:
- React 19 + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- React Helmet (SEO)
- React Router (multi-market routing)

**Backend**:
- Express + Node.js
- Prisma (SQLite dev → PostgreSQL prod)
- BullMQ + Redis (background jobs)
- OpenAI/Gemini (AI summaries, images)

**Infrastructure**:
- Keep existing: JWT auth, API structure
- Add: RSS parser, sitemap generator
- Deploy: Render or Vercel (frontend) + Render (backend)

## LinkedIn Integration (Kept)

### Use Cases
1. **Article Promotion**: When admin publishes article, option to post to LinkedIn
2. **Scheduled Posts**: Schedule LinkedIn posts for articles (reuse existing ScheduledPost)
3. **Custom LinkedIn Content**: Write LinkedIn-specific caption for article links
4. **Multiple Accounts**: Different admins can connect their own LinkedIn accounts

### Implementation
- Keep all existing LinkedIn routes (`/api/linkedin`)
- Keep OAuth flow and token management
- Keep `postToLinkedIn` service
- Add "Post to LinkedIn" button in Article Editor
- Article post format:
  ```
  [Custom caption or article title]
  
  [Brief excerpt or custom text]
  
  Read more: https://propertyhack.com/au/article-slug
  ```

### Article Editor LinkedIn Flow
```tsx
// In ArticleEditor component
<button onClick={() => handlePostToLinkedIn(article)}>
  Post to LinkedIn
</button>

// Opens modal to customize LinkedIn caption
<LinkedInPostModal 
  article={article}
  defaultCaption={article.title}
  articleUrl={`https://propertyhack.com/${article.market.toLowerCase()}/${article.slug}`}
  onPost={(caption) => postToLinkedIn({ text: caption, imageUrl: article.imageUrl })}
/>
```

## Future Enhancements

1. **Newsletter Integration**: Auto-send articles to Beehiiv
2. **Auto LinkedIn Posting**: Option to auto-post all published articles
3. **User Comments**: Allow readers to comment
4. **Advanced Search**: Full-text search across articles
5. **Analytics Dashboard**: Track most popular articles + LinkedIn engagement
6. **Email Alerts**: Send article digests to subscribers
7. **Mobile App**: React Native wrapper

## Migration Notes

### Data to Keep
- User accounts (admins)
- Current auth system

### Data to Remove
- DraftPost, PublishedPost (LinkedIn-specific)
- ScheduledPost (unless repurposing for article scheduling)
- PromptTemplate (or adapt for article prompts)

### Code to Keep
- `/server/services/` (AI, auth)
- `/server/queues/` and `/workers/` (background jobs)
- Auth routes and middleware
- Prisma client setup

### Code to Replace
- All dashboard/homepage components
- Landing page
- Post creation wizard → Article editor

---

## Next Steps

1. Review this plan
2. Confirm approach and any modifications
3. Start with Phase 1: Database schema
4. Iteratively build and test each phase
5. Deploy staging site for review
