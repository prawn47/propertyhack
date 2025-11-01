# Bug Report: Post Scheduling Token Expiry Issue

**Priority:** HIGH  
**Date Created:** 2025-11-01  
**Status:** Identified - Needs Implementation

---

## Summary
Post scheduling does not work correctly due to LinkedIn token management issues. Posts should be schedulable up to 30 days in advance (matching token expiry), and the token should be refreshed every time a post is scheduled to ensure token validity at post time.

---

## Current Behavior

### Token Management Issues
1. **Cookie-based token storage**: LinkedIn access tokens are stored in HTTP-only cookies (30-day expiry) via `linkedin_access_token` cookie
2. **Database token sync**: The `/api/user/linkedin-sync` endpoint syncs cookie token to database, but:
   - Only called manually
   - Not automatically invoked when scheduling posts
   - Token in database can become stale/expired
3. **Scheduled post worker**: Background worker uses database token (`user.linkedinAccessToken`) to post, not the fresh cookie token

### Consequences
- Scheduled posts fail silently if database token expires before scheduled time
- No automatic token refresh mechanism when scheduling posts
- 30-day scheduling window is theoretical but not guaranteed

### Current Flow
```
1. User connects LinkedIn → Cookie set (30 days) + DB updated
2. User schedules post → Stored in ScheduledPost table
   ❌ No token refresh
   ❌ No validation of token validity for future date
3. Background worker runs → Uses DB token
   ❌ If DB token expired, post fails
   ❌ Worker logs error but doesn't update status
```

---

## Expected Behavior

### Token Refresh on Schedule
When a user schedules a post:
1. **Validate LinkedIn connection**: Check that user has valid LinkedIn connection
2. **Refresh token in database**: Sync current cookie token to database (`/api/user/linkedin-sync`)
3. **Validate scheduling window**: Ensure `scheduledFor` is within 30 days (LinkedIn token expiry)
4. **Store post with confidence**: Token will be valid when worker runs

### Enhanced Worker
1. **Pre-check token expiry**: Before attempting to post, verify token hasn't expired
2. **Better error handling**: Distinguish between token expiry vs. other LinkedIn API errors
3. **Update post status**: Mark posts as `'failed'` with reason when token expires

### User Notifications
- Warn user if scheduling post >30 days in future
- Show clear error if LinkedIn token is expired when scheduling
- Display token expiry date in settings

---

## Technical Details

### Files Affected
1. **`server/routes/api.js`**
   - Line 378-425: `POST /posts/scheduled` endpoint
   - Need to add token refresh logic

2. **`server/index.js`**
   - Lines 211-294: `processDueScheduledPosts()` function
   - Need to enhance token validation and error handling

3. **`services/schedulingService.ts`**
   - Lines 25-56: `createScheduledPost()` function
   - May need to add token refresh call

4. **`server/prisma/schema.prisma`**
   - Lines 22-25: User LinkedIn fields
   - Already has `linkedinTokenExpiry` field (good!)

### Current Token Sync Endpoint
```javascript
// server/routes/api.js lines 721-745
router.post('/user/linkedin-sync', async (req, res) => {
  const accessToken = req.cookies && req.cookies.linkedin_access_token;
  if (!accessToken) {
    return res.status(400).json({ error: 'LinkedIn cookie token not found' });
  }

  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const updated = await req.prisma.user.update({
    where: { id: req.user.id },
    data: {
      linkedinAccessToken: accessToken,
      linkedinTokenExpiry: expiry,
      linkedinConnected: true,
    },
    // ...
  });
  // ...
});
```

---

## Proposed Solution

### 1. Auto-Refresh Token When Scheduling
Modify `POST /posts/scheduled` endpoint:

```javascript
// server/routes/api.js - around line 378
router.post('/posts/scheduled', scheduledPostValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, text, imageUrl, scheduledFor } = req.body;
    
    // Validate scheduled time is in future
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }
    
    // ✅ NEW: Validate 30-day window
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (scheduledDate > maxDate) {
      return res.status(400).json({ 
        error: 'Cannot schedule posts more than 30 days in advance (LinkedIn token expiry limit)'
      });
    }
    
    // ✅ NEW: Auto-refresh LinkedIn token from cookie to database
    const cookieToken = req.cookies?.linkedin_access_token;
    if (cookieToken) {
      const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await req.prisma.user.update({
        where: { id: req.user.id },
        data: {
          linkedinAccessToken: cookieToken,
          linkedinTokenExpiry: tokenExpiry,
          linkedinConnected: true,
        },
      });
      console.log('[schedule] Refreshed LinkedIn token in database for user', req.user.id);
    } else {
      // No cookie token available
      const user = await req.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { linkedinConnected: true, linkedinTokenExpiry: true },
      });
      
      if (!user?.linkedinConnected) {
        return res.status(400).json({ 
          error: 'LinkedIn account not connected. Please connect your account in Settings.'
        });
      }
      
      // Check if DB token will still be valid at scheduled time
      if (user.linkedinTokenExpiry && new Date(user.linkedinTokenExpiry) < scheduledDate) {
        return res.status(400).json({
          error: 'LinkedIn token will expire before scheduled time. Please reconnect your account.'
        });
      }
    }
    
    // Create scheduled post (existing logic)
    const scheduledPost = await req.prisma.scheduledPost.create({
      // ... existing code
    });
    
    res.status(201).json(scheduledPost);
  } catch (error) {
    console.error('Create scheduled post error:', error);
    res.status(500).json({ error: 'Failed to create scheduled post' });
  }
});
```

### 2. Enhanced Worker Error Handling
Modify `processDueScheduledPosts()` function:

```javascript
// server/index.js - around line 211
async function processDueScheduledPosts() {
  try {
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
    });
    
    console.log('[scheduler] Found', duePosts.length, 'due posts');

    for (const post of duePosts) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: post.userId },
          select: {
            linkedinAccessToken: true,
            linkedinTokenExpiry: true,
            linkedinConnected: true,
          },
        });

        // ✅ ENHANCED: Better validation checks
        if (!user?.linkedinConnected || !user.linkedinAccessToken) {
          console.log('[scheduler] Marking post', post.id, 'as failed - no LinkedIn connection');
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
          continue;
        }
        
        // ✅ ENHANCED: Check token expiry BEFORE attempting post
        if (user.linkedinTokenExpiry && new Date() > new Date(user.linkedinTokenExpiry)) {
          console.log('[scheduler] Marking post', post.id, 'as failed - token expired');
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
          continue;
        }

        // Attempt to post to LinkedIn
        await postToLinkedInWithToken({
          accessToken: user.linkedinAccessToken,
          text: post.text,
          imageUrl: post.imageUrl || undefined,
        });

        // Success - update status and create published post
        await prisma.$transaction(async (tx) => {
          await tx.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'published' },
          });
          await tx.publishedPost.create({
            data: {
              userId: post.userId,
              title: post.title,
              text: post.text,
              imageUrl: post.imageUrl,
              publishedAt: new Date().toLocaleString(),
            },
          });
        });
        console.log('[scheduler] Successfully published post', post.id);
        
      } catch (err) {
        console.error('[scheduler] Failed to publish post', post.id, err.message);
        // ✅ ENHANCED: Always mark as failed (previously it would leave as 'scheduled')
        try {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
        } catch (updateErr) {
          console.error('[scheduler] Failed to update post status', post.id, updateErr.message);
        }
      }
    }
  } catch (error) {
    console.error('[scheduler] Unexpected error:', error);
  }
}
```

### 3. Frontend Validation (Optional Enhancement)
In `services/schedulingService.ts`, add pre-flight check:

```typescript
export async function createScheduledPost(
  title: string,
  text: string,
  imageUrl: string | undefined,
  scheduledFor: string
): Promise<ScheduledPost> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No access token found');
  }

  // ✅ NEW: Validate 30-day window client-side
  const scheduledDate = new Date(scheduledFor);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  
  if (scheduledDate > maxDate) {
    throw new Error('Cannot schedule posts more than 30 days in advance');
  }

  const response = await fetch(`${API_BASE_URL}/posts/scheduled`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      text,
      imageUrl,
      scheduledFor,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create scheduled post');
  }

  return response.json();
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Token refresh is called when scheduling post
- [ ] 30-day validation rejects posts >30 days in future
- [ ] Error thrown if LinkedIn not connected
- [ ] Error thrown if token will expire before scheduled time

### Integration Tests
1. **Happy Path**
   - [ ] User connects LinkedIn
   - [ ] User schedules post for 2 minutes from now
   - [ ] Worker picks up post and publishes successfully
   - [ ] Post appears in published posts list

2. **Token Refresh**
   - [ ] User schedules post with fresh cookie token
   - [ ] Database token is updated with 30-day expiry
   - [ ] Worker uses refreshed token to publish

3. **30-Day Limit**
   - [ ] Attempt to schedule post 31 days in future
   - [ ] Receive clear error message
   - [ ] Post is NOT created in database

4. **Expired Token Handling**
   - [ ] Manually set user's `linkedinTokenExpiry` to past date
   - [ ] Attempt to schedule post
   - [ ] Receive error asking user to reconnect
   - [ ] If post already scheduled, worker marks as 'failed'

5. **Disconnected Account**
   - [ ] User disconnects LinkedIn account
   - [ ] Attempt to schedule post
   - [ ] Receive error asking user to connect account
   - [ ] Existing scheduled posts fail gracefully with 'failed' status

---

## User-Facing Changes

### Settings Page
- Display LinkedIn token expiry date: "Token valid until: Dec 1, 2025"
- Show warning if token expires within 7 days: "Your LinkedIn connection will expire soon. Please reconnect."
- Add "Refresh Connection" button to manually sync token

### Post Scheduling
- Show max scheduling date in datepicker: "You can schedule up to 30 days in advance"
- Show error if attempting to schedule beyond limit
- Show error if LinkedIn not connected with link to Settings

### Scheduled Posts List
- Show 'failed' status posts with reason (e.g., "Token expired")
- Add "Retry" button for failed posts that reconnects LinkedIn if needed

---

## Migration Notes
No database migration required - `linkedinTokenExpiry` field already exists in schema.

However, existing users may have:
- Stale database tokens
- Scheduled posts that will fail

**Recommended**: After deployment, add a one-time script to:
1. Clear all existing scheduled posts with `scheduledFor` > token expiry
2. Notify users to reconnect LinkedIn if they have scheduled posts

---

## References
- LinkedIn token expiry: 60 days (but we use 30 days for cookie safety)
- Current implementation: `server/routes/linkedin.js` line 80-85 (cookie expiry)
- Token sync endpoint: `server/routes/api.js` line 721-745
- Background worker: `server/index.js` line 211-294

---

## Next Steps
1. Implement token refresh in `POST /posts/scheduled` endpoint
2. Enhance worker error handling in `processDueScheduledPosts()`
3. Add frontend validation in `schedulingService.ts`
4. Update UI to show token expiry and better errors
5. Test thoroughly with various edge cases
6. Document new behavior in `WARP.md`
