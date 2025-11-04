const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestScheduledPost() {
  try {
    // Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No users found. Please create a user first.');
      return;
    }

    console.log(`Creating test scheduled post for user: ${user.email}`);

    // Create a post scheduled for 2 minutes from now
    const scheduledFor = new Date(Date.now() + 2 * 60 * 1000);
    
    const post = await prisma.scheduledPost.create({
      data: {
        userId: user.id,
        title: 'BullMQ Test Post',
        text: 'This is a test post to validate BullMQ scheduler integration. Created at ' + new Date().toISOString(),
        status: 'scheduled',
        scheduledFor,
      },
    });

    console.log('✅ Test post created:');
    console.log('   ID:', post.id);
    console.log('   Title:', post.title);
    console.log('   Scheduled for:', scheduledFor.toISOString());
    console.log('   Time until execution:', '2 minutes');
    console.log('\n📋 Next steps:');
    console.log('   1. Make sure backend is running (npm run dev)');
    console.log('   2. Watch the logs for:');
    console.log('      [scheduler] Found 1 due posts - adding to BullMQ queue');
    console.log('      [scheduler] ✓ Queued post ' + post.id);
    console.log('      [scheduled-posts-worker] Processing post ' + post.id);
    console.log('      [scheduled-posts-worker] Successfully published post ' + post.id);
    console.log('\n⚠️  Note: User must have valid LinkedIn token for post to publish');

  } catch (error) {
    console.error('Error creating test post:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestScheduledPost();
