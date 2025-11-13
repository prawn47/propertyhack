# Admin API Testing Guide

## Prerequisites
1. Backend server running: `cd server && npm run dev`
2. User account created and logged in
3. JWT access token from login

## Get JWT Token
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Response will include accessToken - use this for subsequent requests
```

## Test Article Routes

### 1. List Articles
```bash
curl -X GET "http://localhost:3001/api/admin/articles?status=draft&market=AU" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Create Article
```bash
curl -X POST http://localhost:3001/api/admin/articles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sydney Property Prices Surge in Q1 2025",
    "slug": "sydney-property-prices-surge-q1-2025",
    "summary": "Property prices in Sydney have increased by 8% in the first quarter of 2025...",
    "sourceUrl": "https://www.domain.com.au/example",
    "sourceName": "Domain",
    "metaDescription": "Sydney property market sees strong growth with 8% price increase in Q1 2025",
    "focusKeywords": "[\"sydney property\", \"housing market\", \"property prices\"]",
    "market": "AU",
    "imageAltText": "Aerial view of Sydney CBD skyline with residential apartments",
    "featured": false
  }'
```

### 3. Generate AI Summary
```bash
curl -X POST http://localhost:3001/api/admin/articles/generate-summary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceContent": "Original article text here... Property prices in Sydney increased dramatically...",
    "focusKeywords": ["sydney property", "housing market", "investment"],
    "market": "AU"
  }'
```

### 4. Generate Alt Text
```bash
curl -X POST http://localhost:3001/api/admin/articles/generate-alt-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sydney Property Prices Surge",
    "summary": "Prices increased 8% in Q1...",
    "focusKeywords": ["sydney property", "housing market"]
  }'
```

### 5. Publish Article
```bash
curl -X POST http://localhost:3001/api/admin/articles/ARTICLE_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Update Article
```bash
curl -X PUT http://localhost:3001/api/admin/articles/ARTICLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "featured": true,
    "imageUrl": "base64_or_url_here"
  }'
```

### 7. Delete Article
```bash
curl -X DELETE http://localhost:3001/api/admin/articles/ARTICLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Test Categories Routes

### List Categories
```bash
curl -X GET "http://localhost:3001/api/admin/meta/categories?market=AU" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Category
```bash
curl -X POST http://localhost:3001/api/admin/meta/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "First Home Buyers",
    "slug": "first-home-buyers",
    "description": "Tips and news for first home buyers",
    "market": "AU"
  }'
```

## Test Sources Routes

### List Sources
```bash
curl -X GET "http://localhost:3001/api/admin/meta/sources?market=AU" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Source
```bash
curl -X POST http://localhost:3001/api/admin/meta/sources \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "The Australian Financial Review",
    "url": "https://www.afr.com",
    "feedType": "manual",
    "market": "AU",
    "isActive": true,
    "autoImport": false
  }'
```

### Update Source
```bash
curl -X PUT http://localhost:3001/api/admin/meta/sources/SOURCE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

## Expected Responses

### Success
```json
{
  "id": "clx...",
  "title": "Article Title",
  "slug": "article-slug",
  ...
}
```

### Error
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Next Steps
Once API routes are tested:
1. Build admin UI components
2. Create article editor
3. Build public homepage
