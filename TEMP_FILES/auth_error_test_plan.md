# Authentication Error Test Plan

## Bug Description
When a post fails to publish due to authentication error, it should save as a draft. Previously it was deleted after the error is displayed.

## Fix Implemented
Modified `App.tsx` `handlePublish` function to:
1. Only call `db.publishPost()` AFTER successful LinkedIn posting
2. Catch authentication errors specifically and show helpful message
3. Keep draft in drafts list when any error occurs
4. Reset the publishing state so user can retry

## Test Cases

### Test 1: Authentication Error - No LinkedIn Cookie
**Setup:**
- Log into the app
- Create a draft post
- Clear LinkedIn cookies (or don't connect LinkedIn)

**Steps:**
1. Try to publish a draft post
2. Observe the error message

**Expected Result:**
- Error message: "Authentication error: Please reconnect your LinkedIn account in Settings. Your post has been saved as a draft."
- Draft remains in the "Recent Drafts" section
- Draft is NOT in "Published Posts" section
- User can retry publishing after reconnecting LinkedIn

### Test 2: Authentication Error - Expired LinkedIn Token
**Setup:**
- Log into the app
- Connect LinkedIn account
- Manually expire/invalidate the LinkedIn token

**Steps:**
1. Create a draft post
2. Try to publish it
3. Observe the error message

**Expected Result:**
- Error message about authentication
- Draft remains as a draft
- User can reconnect LinkedIn and retry

### Test 3: Successful Publishing
**Setup:**
- Log into the app
- Connect LinkedIn account with valid token

**Steps:**
1. Create a draft post
2. Publish it

**Expected Result:**
- Success message: "Post \"[title]\" published successfully to LinkedIn!"
- Draft is removed from "Recent Drafts"
- Post appears in "Published Posts" section
- Post is visible on LinkedIn

### Test 4: Other Errors (Network, API, etc.)
**Setup:**
- Log into the app
- Connect LinkedIn
- Simulate network error or API failure

**Steps:**
1. Create a draft post
2. Try to publish (with simulated error)
3. Observe the error message

**Expected Result:**
- Error message: "Failed to publish post: [error message]. Your post has been saved as a draft."
- Draft remains as a draft
- User can retry when issue is resolved

## Code Changes Summary

### File: App.tsx
**Lines Changed:** 340-401

**Key Changes:**
1. Added comment: "First publish to LinkedIn - this can fail due to auth issues"
2. Added comment: "Only move from drafts to published in our database if LinkedIn post succeeded"
3. Enhanced error handling with specific authentication error detection
4. Updated error messages to inform user that post is saved as draft
5. Changed `draftToPublish.id` to `persistedDraft.id` for consistency

## How to Run Tests

1. Start the development servers:
   ```bash
   # Terminal 1 - Frontend
   npm run dev
   
   # Terminal 2 - Backend
   cd server
   npm run dev
   ```

2. Open browser to `http://localhost:3004`

3. Follow test cases above

## Success Criteria
✅ Posts that fail to publish due to authentication errors remain as drafts
✅ User receives clear error message explaining what happened
✅ User can retry publishing after fixing authentication
✅ Successful publishes still work correctly
✅ No data loss - drafts are never deleted unexpectedly
