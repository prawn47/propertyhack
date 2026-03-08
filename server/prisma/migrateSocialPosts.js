const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.socialPost.findMany({
    where: {
      platform: null,
    },
  });

  console.log(`Found ${posts.length} posts to migrate`);
  let created = 0;
  let skipped = 0;

  for (const post of posts) {
    const platforms = post.platforms || [];

    if (platforms.length === 0) {
      console.log(`Skipping post ${post.id} — no platforms`);
      skipped++;
      continue;
    }

    if (platforms.length === 1) {
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { platform: platforms[0] },
      });
      console.log(`Updated post ${post.id} — platform: ${platforms[0]}`);
      created++;
      continue;
    }

    // Multiple platforms — keep first on original row, create new rows for rest
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { platform: platforms[0] },
    });
    console.log(`Updated post ${post.id} — platform: ${platforms[0]}`);
    created++;

    for (let i = 1; i < platforms.length; i++) {
      await prisma.socialPost.create({
        data: {
          content: post.content,
          imageUrl: post.imageUrl,
          platforms: [platforms[i]],
          platform: platforms[i],
          articleId: post.articleId,
          status: post.status,
          scheduledFor: post.scheduledFor,
          publishedAt: post.publishedAt,
          platformResults: post.platformResults?.[platforms[i]] ? { [platforms[i]]: post.platformResults[platforms[i]] } : null,
        },
      });
      console.log(`Created new post for platform: ${platforms[i]} (from ${post.id})`);
      created++;
    }
  }

  console.log(`Migration complete: ${created} processed, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
