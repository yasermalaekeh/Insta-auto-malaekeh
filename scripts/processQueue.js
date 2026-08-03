const db = require('./db');
const instagramService = require('./services/instagramService');
const telegramService = require('./services/telegramService');
const captionService = require('./services/captionService');

async function generateAndRequestApproval() {
  const pending = db.getPendingPosts();
  if (pending.length === 0) {
    console.log('صف خالی است — پستی برای تولید کپشن وجود ندارد.');
    return;
  }
  console.log(`📋 ${pending.length} پست منتظر تولید کپشن`);
  for (const post of pending) {
    try {
      let caption = post.caption;
      const updates = {};

      if (!caption && post.specs) {
        console.log(`✍️ در حال محاسبه قیمت و تولید کپشن برای پست ${post.id}...`);
        const result = await captionService.generateCaption(post.specs);
        caption = result.caption;
        updates.caption = caption;
        if (result.priceBreakdown) {
          updates.priceBreakdown = result.priceBreakdown;
          console.log(`💰 قیمت نهایی: ${result.priceBreakdown.finalPrice.toLocaleString('fa-IR')} تومان`);
        }
      }

      console.log(`📨 ارسال پیش‌نمایش برای تایید پست ${post.id}...`);
      const approvalResult = await telegramService.sendApprovalRequest({
        mediaUrl: post.mediaUrl,
        mediaUrls: post.mediaUrls,
        caption,
        postId: post.id,
      });

      updates.status = 'awaiting_approval';
      updates.approvalMessageId = approvalResult.messageId;
      db.updatePost(post.id, updates);
      console.log(`✅ پست ${post.id} برای تایید ارسال شد — منتظر تصمیم شما در تلگرام`);
    } catch (err) {
      console.error(`❌ خطا در آماده‌سازی پست ${post.id}:`, err.message);
      db.updatePost(post.id, { status: 'failed', error: err.message });
    }
  }
}

async function publishApprovedPost(post) {
  const finalCaption = post.caption || '';
  const publishResults = {};

  try {
    const tgResult = await telegramService.publishContent({
      mediaUrl: post.mediaUrl,
      mediaUrls: post.mediaUrls,
      caption: finalCaption,
    });
    publishResults.telegram = { messageId: tgResult.messageId, allMessageIds: tgResult.allMessageIds };
    console.log(`✅ پست ${post.id} در کانال تلگرام منتشر شد`);
  } catch (tgErr) {
    console.error(`❌ خطا در انتشار پست ${post.id} در تلگرام:`, tgErr.message);
    publishResults.telegramError = tgErr.message;
  }

  if (process.env.IG_ACCESS_TOKEN && process.env.IG_BUSINESS_ACCOUNT_ID) {
    try {
      const igResult = await instagramService.publishContent({
        mediaUrl: post.mediaUrl,
        caption: finalCaption,
        mediaType: post.type,
      });
      publishResults.instagram = { mediaId: igResult.mediaId };
      console.log(`✅ پست ${post.id} در اینستاگرام منتشر شد`);
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
}

async function processApprovals() {
  const offset = db.getOffset();
  const { actions, nextOffset } = await telegramService.getApprovalActions(offset);

  if (actions.length === 0) {
    console.log('ℹ️ هیچ تصمیم جدیدی (تایید/رد) از تلگرام دریافت نشد.');
  }

  for (const { action, postId, callbackQueryId, messageId } of actions) {
    const post = db.getPostById(postId);
    if (!post || post.status !== 'awaiting_approval') {
      await telegramService.answerCallback(callbackQueryId, 'این پست قبلاً پردازش شده است.');
      continue;
    }

    if (action === 'approve') {
      await telegramService.answerCallback(callbackQueryId, '✅ در حال انتشار...');
      await publishApprovedPost(post);
      if (messageId) {
        await telegramService.clearKeyboard(messageId);
        await telegramService.sendAdminNote(`✅ پست ${postId} با موفقیت منتشر شد.`);
      }
    } else if (action === 'reject') {
      db.updatePost(postId, { status: 'rejected' });
      await telegramService.answerCallback(callbackQueryId, '❌ پست رد شد و منتشر نمی‌شود.');
      if (messageId) {
        await telegramService.clearKeyboard(messageId);
        await telegramService.sendAdminNote(`❌ پست ${postId} رد شد و منتشر نخواهد شد.`);
      }
    }
  }

  if (nextOffset > offset) db.setOffset(nextOffset);
}

async function main() {
  await generateAndRequestApproval();
  await processApprovals();
}

main().catch((err) => {
  console.error('خطای کلی:', err);
  process.exit(1);
});
