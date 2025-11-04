# Super Admin System Prompts Guide

## Overview
Super admins can configure system-level prompts that control how AI generates content. These prompts are appended to the standard user prompts for specific workflows.

## Access
1. Login as a super admin user (user with `superAdmin = true` in database)
2. Go to Settings
3. Click "⚙️ Super Admin" button in top right
4. Manage system prompts

## Key System Prompts

### 1. super_admin_rules
**Purpose**: Global rules that are prepended to ALL post generation when commenting on news articles

**Use cases**:
- Enforce company-wide content policies
- Set guardrails for AI behavior
- Define restricted topics or language
- Ensure brand consistency

**Example content**:
```
SUPER ADMIN RULES:
- Never use profanity or inflammatory language
- Always maintain a professional, respectful tone
- Avoid political commentary unless explicitly business-related
- Do not mention competitors by name in a negative context
- Focus on adding value and insight, not just summarizing
```

### 2. news_comment_generation
**Purpose**: Specific instructions for generating commentary on news articles

**Use cases**:
- Guide the style of news commentary
- Define what makes a good commentary post
- Set length requirements
- Specify citation formats

**Example content**:
```
NEWS COMMENTARY GUIDELINES:
When commenting on a news article, follow these principles:

1. Add unique insight or analysis beyond what's in the article
2. Connect the news to broader industry trends or implications
3. Include 1-2 actionable takeaways for the target audience
4. Keep posts between 150-250 words for optimal LinkedIn engagement
5. Always include a reference to the original article at the end
6. Use the format: "Read the full article: [title] ([source])"
7. Avoid simply restating the article's main points
8. Share a personal perspective or professional experience related to the topic
```

## How System Prompts Work

### News Commentary Flow
1. User clicks "💬 Comment & Post" on a news article
2. System generates post ideas
3. User selects an idea
4. **System builds the prompt**:
   - Base user persona settings (from UserSettings)
   - PromptTemplate for 'post_generation' (if exists)
   - `super_admin_rules` content (if active)
   - `news_comment_generation` content (if active)
5. AI generates the post with all combined instructions

### Prompt Precedence
The final system instruction is built in this order:
1. `super_admin_rules` (if active)
2. Base user persona from UserSettings
3. PromptTemplate (if exists)
4. `news_comment_generation` (if active for news)

Each layer adds to and refines the previous layers.

## Creating System Prompts

### Via UI
1. Navigate to Super Admin Settings
2. Click "Create New System Prompt"
3. Fill in:
   - **Name**: Unique identifier (e.g., `super_admin_rules`, `news_comment_generation`)
   - **Description**: Brief explanation of purpose
   - **Content**: The actual prompt text
   - **Active**: Toggle on/off
4. Click "Save"

### Via API (for automation)
```bash
curl -X PUT http://localhost:3001/api/super-admin/system-prompts/super_admin_rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Global rules for all content generation",
    "content": "Your prompt content here...",
    "isActive": true
  }'
```

## Best Practices

### Writing Effective System Prompts
1. **Be specific**: Vague instructions lead to inconsistent results
2. **Use examples**: Show the AI what "good" looks like
3. **Set boundaries**: Explicitly state what NOT to do
4. **Test iteratively**: Make small changes and observe results
5. **Keep it concise**: Long prompts can dilute important instructions

### Managing Multiple Prompts
- Use descriptive names (underscore_separated_lowercase)
- Keep descriptions updated as you modify content
- Use the "Active" toggle to test changes without deleting
- Version control: Keep a backup of working prompts before major changes

### Testing Changes
1. Toggle the prompt to inactive
2. Generate a test post
3. Activate the new prompt
4. Generate another test post
5. Compare results
6. Adjust as needed

## API Endpoints

All endpoints require authentication and super admin privileges.

### List all system prompts
```
GET /api/super-admin/system-prompts
```

### Get specific prompt
```
GET /api/super-admin/system-prompts/:name
```

### Create/Update prompt
```
PUT /api/super-admin/system-prompts/:name
Body: { description, content, isActive }
```

### Toggle active status
```
PATCH /api/super-admin/system-prompts/:name/toggle
```

### Delete prompt
```
DELETE /api/super-admin/system-prompts/:name
```

## Database Schema

```prisma
model SystemPrompt {
  id          String   @id @default(cuid())
  name        String   @unique
  description String
  content     String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Troubleshooting

### Prompts not being applied
1. Check that the prompt is marked as "Active"
2. Verify the prompt name matches exactly (case-sensitive)
3. Check browser console for any fetch errors
4. Confirm user has super admin privileges

### Unexpected AI behavior
1. Review all active system prompts - they're all combined
2. Check for contradictory instructions between prompts
3. Test with prompts disabled to isolate the issue
4. Consider prompt length - very long prompts may be truncated

### Access denied errors
- Confirm user has `superAdmin: true` in the database
- Check JWT token is valid and not expired
- Verify backend middleware is properly configured

## Examples

### Minimal super_admin_rules
```
Keep all content professional and respectful. Avoid controversial topics.
```

### Comprehensive news_comment_generation
```
When generating commentary on news articles:

STRUCTURE:
1. Hook: Start with a thought-provoking question or observation
2. Analysis: Provide 2-3 key insights not in the article
3. Connection: Link to broader trends or reader experience
4. Call-to-action: End with a question to drive engagement
5. Citation: "Read more: [title] via [source]"

STYLE:
- Conversational but professional
- Use short paragraphs (2-3 sentences max)
- Include specific data points or examples when possible
- Avoid jargon unless the audience is technical
- Write in active voice

LENGTH: 150-250 words total

DO NOT:
- Simply summarize the article
- Use clickbait language
- Make unsubstantiated claims
- Ignore the user's persona settings
```

## Support

For technical issues or questions about system prompts:
1. Check server logs: `tail -f server/logs/app.log`
2. Review Prisma queries in code: `server/routes/superAdmin.js`
3. Test with curl to isolate frontend vs backend issues
