const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Post to LinkedIn with access token
 */
async function postToLinkedInWithToken({ accessToken, text, imageUrl }) {
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
 * Process a scheduled post job
 */
async function processScheduledPost(job) {
  const { postId } = job.data;
  
  console.log(`[scheduled-posts-worker] Processing post ${postId}`);

  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
  });

  if (!post) {
    console.log(`[scheduled-posts-worker] Post ${postId} not found, skipping`);
    return;
  }

  if (post.status !== 'scheduled') {
    console.log(`[scheduled-posts-worker] Post ${postId} status is ${post.status}, skipping`);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: post.userId },
    select: {
      linkedinAccessToken: true,
      linkedinTokenExpiry: true,
      linkedinConnected: true,
    },
  });

  if (!user || !user.linkedinConnected || !user.linkedinAccessToken) {
    throw new Error(`No valid LinkedIn token for user ${post.userId}`);
  }

  if (user.linkedinTokenExpiry && new Date() > new Date(user.linkedinTokenExpiry)) {
    throw new Error(`LinkedIn token expired for user ${post.userId}`);
  }

  // Post to LinkedIn
  await postToLinkedInWithToken({
    accessToken: user.linkedinAccessToken,
    text: post.text,
    imageUrl: post.imageUrl || undefined,
  });

  // Move to published posts and delete from scheduled
  await prisma.$transaction(async (tx) => {
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

  console.log(`[scheduled-posts-worker] Successfully published post ${postId}`);
}

// Create the worker
const scheduledPostsWorker = new Worker('scheduled-posts', processScheduledPost, {
  connection,
  concurrency: 5, // Process up to 5 posts concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // per 1 second
  },
});

// Worker event handlers
scheduledPostsWorker.on('completed', (job) => {
  console.log(`[scheduled-posts-worker] Job ${job.id} completed`);
});

scheduledPostsWorker.on('failed', (job, err) => {
  console.error(`[scheduled-posts-worker] Job ${job?.id} failed:`, err.message);
  
  // Mark post as failed in database
  if (job?.data?.postId) {
    prisma.scheduledPost.update({
      where: { id: job.data.postId },
      data: { status: 'failed' },
    }).catch(dbErr => {
      console.error(`[scheduled-posts-worker] Failed to mark post ${job.data.postId} as failed:`, dbErr);
    });
  }
});

scheduledPostsWorker.on('error', (err) => {
  console.error('[scheduled-posts-worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[scheduled-posts-worker] SIGTERM received, closing worker');
  await scheduledPostsWorker.close();
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('[scheduled-posts-worker] SIGINT received, closing worker');
  await scheduledPostsWorker.close();
  await prisma.$disconnect();
});

module.exports = { scheduledPostsWorker };
