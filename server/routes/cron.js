/**
 * Cron routes for external schedulers (e.g. Render Cron Jobs, GitHub Actions)
 * 
 * Security: Use CRON_SECRET env var to authenticate requests
 */

const express = require('express');
const router = express.Router();

/**
 * Check for due scheduled posts and publish them directly
 * Called by external cron every 1-2 minutes
 * 
 * POST /api/cron/process-scheduled-posts
 * Header: X-Cron-Secret: <CRON_SECRET>
 */
router.post('/process-scheduled-posts', async (req, res) => {
  try {
    // Verify cron secret
    const cronSecret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const duePosts = await req.prisma.scheduledPost.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: { lte: now },
      },
      include: {
        user: {
          select: {
            linkedinAccessToken: true,
            linkedinTokenExpiry: true,
            linkedinConnected: true,
          },
        },
      },
    });

    console.log(`[cron] Found ${duePosts.length} due posts at ${now.toISOString()}`);

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    for (const post of duePosts) {
      try {
        // Validate LinkedIn token
        if (!post.user.linkedinConnected || !post.user.linkedinAccessToken) {
          console.log(`[cron] Skipping post ${post.id} - no LinkedIn token`);
          await req.prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
          results.skipped++;
          continue;
        }

        if (post.user.linkedinTokenExpiry && new Date() > new Date(post.user.linkedinTokenExpiry)) {
          console.log(`[cron] Skipping post ${post.id} - token expired`);
          await req.prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
          results.skipped++;
          continue;
        }

        // Post to LinkedIn
        await postToLinkedIn({
          accessToken: post.user.linkedinAccessToken,
          text: post.text,
          imageUrl: post.imageUrl,
        });

        // Move to published posts
        await req.prisma.$transaction(async (tx) => {
          await tx.publishedPost.create({
            data: {
              userId: post.userId,
              title: post.title,
              text: post.text,
              imageUrl: post.imageUrl,
              publishedAt: new Date().toLocaleString(),
            },
          });
          await tx.scheduledPost.delete({
            where: { id: post.id },
          });
        });

        console.log(`[cron] ✓ Published post ${post.id}`);
        results.processed++;
      } catch (error) {
        console.error(`[cron] Failed to publish post ${post.id}:`, error.message);
        
        // Mark as failed
        await req.prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: 'failed' },
        }).catch(e => console.error('Failed to mark post as failed:', e));
        
        results.failed++;
        results.errors.push({ postId: post.id, error: error.message });
      }
    }

    res.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('[cron] Error processing scheduled posts:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Post to LinkedIn with access token
 */
async function postToLinkedIn({ accessToken, text, imageUrl }) {
  // Get LinkedIn user id
  const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error(`Failed to fetch LinkedIn user info: ${await userInfoResponse.text()}`);
  }
  const userInfo = await userInfoResponse.json();
  const linkedInUserId = userInfo.sub;

  let imageUrn = null;
  if (imageUrl) {
    // Register upload
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${linkedInUserId}`,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    });
    if (!registerResponse.ok) {
      throw new Error(`Failed to register image upload: ${await registerResponse.text()}`);
    }
    const registerData = await registerResponse.json();
    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    imageUrn = registerData.value.asset;

    // Fetch image bytes and upload
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Failed to fetch image URL: ${await imgResp.text()}`);
    }
    const contentType = imgResp.headers.get('content-type') || 'image/png';
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: imgBuffer,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed: ${await uploadResponse.text()}`);
    }
  }

  const postBody = {
    author: `urn:li:person:${linkedInUserId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  if (imageUrn) {
    postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
      { status: 'READY', media: imageUrn },
    ];
  }

  const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });
  if (!postResponse.ok) {
    throw new Error(`LinkedIn post failed: ${await postResponse.text()}`);
  }
}

/**
 * Health check for cron endpoints
 * GET /api/cron/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing',
  });
});

module.exports = router;
