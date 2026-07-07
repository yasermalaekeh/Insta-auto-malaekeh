const db = require('./db');
const instagramService = require('./services/instagramService');

async function main() {
  const pending = db.getPendingPosts();

  if (pending.length === 0) {
    console.log('صف خالی است — پستی برای انتشار وجود ندارد.');
    return;
  }

  console.log(`📋 ${pending.length} پست آماده انتشار پیدا شد`);

  for (const post of pending) {
    try {
      console.log(`🚀 در حال انتشار پست ${post.id} (${post.type})...`);
      const result = await instagramService.publishContent({
        mediaUrl: post.mediaUrl,
        caption: post.caption,
        mediaType: post.type,
      });
      db.updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        instagramMediaId: result.mediaId,
      });
      console.log(`✅ پست ${post.id} با موفقیت منتشر شد (media id: ${result.mediaId})`);
    } catch (err) {
      console.error(`❌ خطا در انتشار پست ${post.id}:`, err.message);
      db.updatePost(post.id, { status: 'failed', error: err.message });
    }
  }
}

main().catch((err) => {
  console.error('خطای کلی:', err);
  process.exit(1);
});
