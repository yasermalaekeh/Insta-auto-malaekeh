const db = require('./db');
const instagramService = require('./services/instagramService');
const telegramService = require('./services/telegramService');
const captionService = require('./services/captionService');

async function main() {
  const pending = db.getPendingPosts();
  if (pending.length === 0) {
    console.log('صف خالی است — پستی برای انتشار وجود ندارد.');
    return;
  }
  console.log(`📋 ${pending.length} پست آماده انتشار پیدا شد`);
  for (const post of pending) {
    try {
      let caption = post.caption;

      if (!caption && post.specs) {
        console.log(`✍️ در حال محاسبه قیمت و تولید کپشن برای پست ${post.id}...`);
        const result = await captionService.generateCaption(post.specs);
        caption = result.caption;
        const updates = { caption };
        if (result.priceBreakdown) {
          updates.priceBreakdown = result.priceBreakdown;
          console.log(`💰 قیمت نهایی محاسبه شد: ${result.priceBreakdown.finalPrice.toLocaleString('fa-IR')} تومان`);
        }
        db.updatePost(post.id, updates);
      }

      const finalCaption = caption || post.caption || '';
      const publishResults = {};

      try {
        console.log(`📨 در حال انتشار پست ${post.id} در تلگرام...`);
        const tgResult = await telegramService.publishContent({
          mediaUrl: post.mediaUrl,
          mediaUrls: post.mediaUrls,
          caption: finalCaption,
        });
        publishResults.telegram = { messageId: tgResult.messageId, allMessageIds: tgResult.allMessageIds };
        console.log(`✅ پست ${post.id} در تلگرام منتشر شد (message id: ${tgResult.messageId})`);
      } catch (tgErr) {
        console.error(`❌ خطا در انتشار پست ${post.id} در تلگرام:`, tgErr.message);
        publishResults.telegramError = tgErr.message;
      }

      if (process.env.IG_ACCESS_TOKEN && process.env.IG_BUSINESS_ACCOUNT_ID) {
        try {
          console.log(`🚀 در حال انتشار پست ${post.id} در اینستاگرام (${post.type})...`);
          const igResult = await instagramService.publishContent({
            mediaUrl: post.mediaUrl,
            caption: finalCaption,
            mediaType: post.type,
          });
          publishResults.instagram = { mediaId: igResult.mediaId };
          console.log(`✅ پست ${post.id} در اینستاگرام منتشر شد (media id: ${igResult.mediaId})`);
        } catch (igErr) {
          console.error(`❌ خطا در انتشار پست ${post.id} در اینستاگرام:`, igErr.message);
          publishResults.instagramError = igErr.message;
        }
      } else {
        console.log('ℹ️ توکن اینستاگرام هنوز تنظیم نشده — این مرحله رد شد.');
      }

      db.updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        publishResults,
      });
      console.log(`✅ پردازش پست ${post.id} کامل شد`);
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
