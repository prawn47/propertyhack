# Super Admin System - Prompt Management

This document describes the super admin system for managing AI prompt templates.

## Overview

The super admin system allows platform owners to manage the system prompts used for AI content generation. This includes:
- Post generation prompts
- Idea generation prompts  
- Image generation prompts

Super admins can create, edit, and manage prompt templates that use variables from user settings.

## Database Schema

### User Model
- `superAdmin` (Boolean): Flag indicating if user is a super admin

### PromptTemplate Model
- `id` (String): Unique identifier
- `name` (String): Template name (e.g., "post_generation", "image_generation")
- `description` (String): Description of the template's purpose
- `template` (String): The prompt text with `{{variable}}` placeholders
- `variables` (JSON Array): List of variable names used in the template
- `isActive` (Boolean): Whether this template is currently active
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

## Setup

### 1. Run Database Migration
The migration has already been applied when you ran `npm run db:migrate`.

### 2. Seed Default Prompt Templates
```bash
cd server
node seed-prompts.js
```

This creates three default templates:
- `post_generation`: For generating LinkedIn post content
- `idea_generation`: For generating post ideas
- `image_generation`: For generating post images

### 3. Promote a User to Super Admin
```bash
cd server
node make-super-admin.js <user-email>
```

Example:
```bash
node make-super-admin.js admin@example.com
```

## Using the System

### Accessing Prompt Management
1. Log in as a super admin user
2. Click your profile icon in the header
3. Select "Prompt Management" from the dropdown menu

### Template Variables

Templates support dynamic variables that are replaced with user settings:

**Available Variables:**
- `{{toneOfVoice}}` - User's tone of voice setting
- `{{industry}}` - User's industry
- `{{position}}` - User's job position
- `{{englishVariant}}` - English variant (American/British/Australian)
- `{{audience}}` - Target audience
- `{{postGoal}}` - Goal of posts
- `{{keywords}}` - Keywords to incorporate
- `{{contentExample1}}` - First content example
- `{{contentExample2}}` - Second content example
- `{{postText}}` - Post text (for image generation)

### Creating a Template

1. Click "Create New Template"
2. Fill in:
   - **Name**: Unique identifier (e.g., `post_generation`)
   - **Description**: Brief description of purpose
   - **Template**: The prompt text with `{{variable}}` placeholders
   - **Variables**: Comma-separated list of variables used (e.g., `toneOfVoice, industry, position`)
   - **Active**: Whether to use this template (checkbox)
3. Click "Create"

### Editing Templates

1. Find the template in the list
2. Click "Edit"
3. Modify fields as needed
4. Click "Update"

### Template Activation

Only one template per name should be active at a time. The system will use the active template matching the requested name. If no active template exists, it falls back to hardcoded defaults.

## API Endpoints

### Public (no auth required)
- `GET /api/prompts/active/:name` - Fetch active template by name

### Super Admin Only
- `GET /api/prompts` - List all templates
- `GET /api/prompts/:id` - Get template by ID
- `POST /api/prompts` - Create new template
- `PUT /api/prompts/:id` - Update template
- `DELETE /api/prompts/:id` - Delete template

## How It Works

1. When generating content, the system calls `getSystemInstruction(templateName, userSettings)`
2. This fetches the active template from `/api/prompts/active/{templateName}`
3. Variables in the template (e.g., `{{toneOfVoice}}`) are replaced with actual user settings
4. The interpolated prompt is used as the system instruction for the AI model
5. If no template is found or the API call fails, it falls back to hardcoded defaults

## Template Examples

### Post Generation Template
```
You are an expert content creator for LinkedIn. Your persona is defined by:
- Tone of Voice: {{toneOfVoice}}
- Industry: {{industry}}
- Position: {{position}}
- Language: {{englishVariant}} English

Your target audience is: {{audience}}.
The primary goal of your posts is: {{postGoal}}.
Incorporate these keywords: {{keywords}}.

Writing style examples:
Example 1: "{{contentExample1}}"
Example 2: "{{contentExample2}}"

Be concise and professional. Structure posts for LinkedIn readability.
```

### Image Generation Template
```
Create a visually appealing and professional image for LinkedIn. 
The image should be abstract or conceptual, suitable for a professional tech audience. 
Avoid text in the image. Use modern, clean styling.

Post content: "{{postText}}..."
```

## Security

- Only users with `superAdmin: true` can access prompt management
- The backend enforces authorization via `requireSuperAdmin` middleware
- Frontend checks `authState.user?.superAdmin` before rendering prompt management
- Regular users cannot view or modify templates

## Best Practices

1. **Test templates** before activating them in production
2. **Version control**: Keep track of template changes in your own documentation
3. **Variable consistency**: Use consistent variable names across templates
4. **Fallback defaults**: System always has hardcoded fallbacks if templates fail to load
5. **One active per name**: Keep only one template active per name to avoid confusion
6. **Clear descriptions**: Write clear descriptions so you remember template purposes

## Troubleshooting

### Templates not loading
- Check browser console for API errors
- Verify template is marked as `isActive: true`
- Check network tab to see if `/api/prompts/active/:name` returns 200

### Variables not replacing
- Ensure variable names in template match exactly (case-sensitive)
- Check that user settings contain values for all variables
- Look for typos in `{{variableName}}` syntax

### Access denied
- Verify user has `superAdmin: true` in database
- Log out and log back in to refresh user session
- Check backend logs for authorization errors
