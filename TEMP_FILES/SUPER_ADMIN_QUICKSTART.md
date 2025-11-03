# Super Admin System - Quick Start Guide

## What Was Built

A complete super admin system for managing AI prompt templates that control how LinkedIn posts, ideas, and images are generated.

## Key Features

✅ **Database Schema**
- Added `superAdmin` field to User model
- Created `PromptTemplate` model with variables support

✅ **Backend API**
- Super admin-only CRUD endpoints for prompt management
- Public endpoint to fetch active templates by name
- Authorization middleware (`requireSuperAdmin`)

✅ **Frontend UI**
- `PromptManagementPage` component for template management
- Integrated into main app with route protection
- Header menu item for super admins only

✅ **AI Integration**
- Updated `geminiService` to fetch and use templates
- Variable interpolation system (`{{variableName}}`)
- Fallback to hardcoded defaults if templates unavailable

✅ **Setup Scripts**
- `seed-prompts.js` - Seeds default templates
- `make-super-admin.js` - Promotes users to super admin

## Quick Setup (3 Steps)

### 1. Seed Default Templates
```bash
cd server
node seed-prompts.js
```

### 2. Make Yourself Super Admin
```bash
cd server
node make-super-admin.js YOUR_EMAIL@example.com
```

### 3. Test It Out
```bash
# Start the app (from project root)
./start.sh

# Or manually:
# Terminal 1: cd server && npm run dev
# Terminal 2: npm run dev

# Then visit: http://localhost:3004
# Log in → Click profile icon → "Prompt Management"
```

## What Super Admins Can Do

1. **View all prompt templates** - See what features are configured
2. **Edit prompts** - Fine-tune how AI generates content
3. **Adjust variables** - Control which user settings are used
4. **Activate/deactivate** - Enable or disable templates
5. **Test changes** - Experiment with prompt wording

## Template Variables

Templates use `{{variableName}}` syntax. Available variables:

- `{{toneOfVoice}}` - User's tone setting
- `{{industry}}` - User's industry
- `{{position}}` - User's position
- `{{englishVariant}}` - English variant
- `{{audience}}` - Target audience
- `{{postGoal}}` - Post goal
- `{{keywords}}` - Keywords
- `{{contentExample1}}` - First example
- `{{contentExample2}}` - Second example
- `{{postText}}` - Post text (for images)

## Default Templates Created

1. **post_generation** - Main LinkedIn post generation
2. **idea_generation** - Post idea brainstorming
3. **image_generation** - Image generation prompts

## File Structure

```
server/
├── prisma/
│   └── schema.prisma              # Added superAdmin + PromptTemplate
├── routes/
│   └── prompts.js                 # NEW: Prompt management routes
├── middleware/
│   └── auth.js                    # Added requireSuperAdmin
├── seed-prompts.js                # NEW: Seed default templates
├── make-super-admin.js            # NEW: Promote users
└── index.js                       # Registered /api/prompts route

components/
└── PromptManagementPage.tsx       # NEW: Super admin UI

services/
├── promptService.ts               # NEW: Frontend API client
└── geminiService.ts               # Updated to use templates

types.ts                            # Added PromptTemplate type
App.tsx                             # Added prompts view
Header.tsx                          # Added Prompt Management menu item
```

## Testing the System

### 1. Test Template Fetching
```bash
curl http://localhost:3001/api/prompts/active/post_generation
```

### 2. Test Super Admin Access (requires login token)
```bash
# List all templates (needs auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/prompts
```

### 3. Test Frontend
- Log in as super admin
- Check for "Prompt Management" in profile menu
- Create/edit/view templates
- Generate a post and check console logs for template usage

## How It Works

```
User generates post
    ↓
geminiService.generateDraftPost()
    ↓
getSystemInstruction('post_generation', settings)
    ↓
Fetch /api/prompts/active/post_generation
    ↓
Interpolate {{variables}} with user settings
    ↓
Use as system instruction for AI model
    ↓
Generate post with custom prompt
```

## Common Tasks

### Add a new user as super admin
```bash
cd server
node make-super-admin.js newadmin@example.com
```

### Edit an existing prompt
1. Log in as super admin
2. Go to Prompt Engineering
3. Find the template (e.g., "post_generation")
4. Click "Edit Prompt"
5. Modify the template text
6. Use `{{variableName}}` for dynamic values
7. Click "Save Changes"
8. Changes apply immediately to all users

### Add a new template (for developers)
```bash
cd server
# Add to seed-prompts.js or create migration
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.promptTemplate.create({
  data: {
    name: 'new_feature_name',
    description: 'Description',
    template: 'Your prompt with {{variables}}',
    variables: JSON.stringify(['toneOfVoice', 'industry']),
    isActive: true
  }
}).then(() => prisma.\$disconnect());
"
# Then update frontend code to call it
```

## Security Notes

- Only super admins can access `/api/prompts/*` (except `/active/:name`)
- Frontend blocks prompt management UI for non-super-admins
- Regular users automatically use templates but can't modify them
- Templates are fetched without authentication (public read)

## Next Steps

1. **Customize templates** - Edit the default prompts to match your brand
2. **Add more templates** - Create templates for different use cases
3. **A/B testing** - Create multiple versions and toggle between them
4. **Monitoring** - Track which templates perform best
5. **Version control** - Keep template history in your own system

## Troubleshooting

**Can't see Prompt Management menu?**
- Verify user has `superAdmin: true` in database
- Log out and back in to refresh session

**Templates not working?**
- Check browser console for errors
- Verify template is `isActive: true`
- Check backend logs for API errors

**Variables not replacing?**
- Ensure variable names match exactly (case-sensitive)
- Check user has values for all required settings

## Documentation

See `SUPER_ADMIN.md` for complete documentation.

---

Backend running on: http://localhost:3001  
Frontend running on: http://localhost:3004
