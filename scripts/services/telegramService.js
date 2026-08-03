const axios = require('axios');
const config = require('../config');

const { botToken, channelUsername, adminChatId } = config.telegram;

function apiUrl(method) {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

function trim(caption) {
  return caption && caption.length > 1024 ? caption.slice(0, 1021) + '...' : caption;
}

async function publishPhoto({ mediaUrl, caption }) {
  const res = await axios.post(apiUrl('sendPhoto'), {
    chat_id: channelUsername,
    photo: mediaUrl,
    caption: trim(caption) || '',
  });
  return { messageId: res.data.result.message_id };
}

async function publishMediaGroup({ mediaUrls, caption }) {
  const media = mediaUrls.map((url, i) => ({
    type: 'photo',
    media: url,
    ...(i === 0 ? { caption: trim(caption) || '' } : {}),
  }));
  const res = await axios.post(apiUrl('sendMediaGroup'), {
    chat_id: channelUsername,
    media,
  });
  return { messageIds: res.data.result.map((m) => m.message_id) };
}

async function publishContent({ mediaUrl, mediaUrls, caption }) {
  if (mediaUrls && mediaUrls.length > 1) {
    const result = await publishMediaGroup({ mediaUrls, caption });
    return { messageId: result.messageIds[0], allMessageIds: result.messageIds };
  }
  const result = await publishPhoto({ mediaUrl, caption });
  return { messageId: result.messageId, allMessageIds: [result.messageId] };
}

async function sendApprovalRequest({ mediaUrl, mediaUrls, caption, postId }) {
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ تایید و انتشار', callback_data: `approve:${postId}` },
      { text: '❌ رد این پست', callback_data: `reject:${postId}` },
    ]],
  };

  if (mediaUrls && mediaUrls.length > 1) {
    await axios.post(apiUrl('sendMediaGroup'), {
      chat_id: adminChatId,
      media: mediaUrls.map((url, i) => ({
        type: 'photo',
        media: url,
        ...(i === 0 ? { caption: '🔍 پیش‌نمایش پست جدید — برای تصمیم به پیام بعدی مراجعه کنید' } : {}),
      })),
    });
    const res = await axios.post(apiUrl('sendMessage'), {
      chat_id: adminChatId,
      text: trim(caption) || '(بدون کپشن)',
      reply_markup: keyboard,
    });
    return { messageId: res.data.result.message_id };
  }

  const res = await axios.post(apiUrl('sendPhoto'), {
    chat_id: adminChatId,
    photo: mediaUrl,
    caption: trim(caption) || '',
    reply_markup: keyboard,
  });
  return { messageId: res.data.result.message_id };
}

async function getApprovalActions(lastOffset) {
  const res = await axios.get(apiUrl('getUpdates'), {
    params: { offset: lastOffset, timeout: 0 },
  });
  const updates = res.data.result || [];
  const actions = [];
  let maxUpdateId = lastOffset - 1;

  for (const update of updates) {
    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;
    const cq = update.callback_query;
    if (cq && cq.data && (cq.data.startsWith('approve:') || cq.data.startsWith('reject:'))) {
      const [action, postId] = cq.data.split(':');
      actions.push({
        action,
        postId,
        callbackQueryId: cq.id,
        messageId: cq.message ? cq.message.message_id : null,
      });
    }
  }

  return { actions, nextOffset: maxUpdateId + 1 };
}

async function answerCallback(callbackQueryId, text) {
  try {
    await axios.post(apiUrl('answerCallbackQuery'), { callback_query_id: callbackQueryId, text });
  } catch (e) { /* بی‌اهمیت اگر callback قدیمی شده باشد */ }
}

async function clearKeyboard(messageId) {
  try {
    await axios.post(apiUrl('editMessageReplyMarkup'), {
      chat_id: adminChatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (e) { /* بی‌اهمیت */ }
}

async function sendAdminNote(text) {
  try {
    await axios.post(apiUrl('sendMessage'), { chat_id: adminChatId, text });
  } catch (e) { /* بی‌اهمیت */ }
}

module.exports = {
  publishContent,
  publishPhoto,
  publishMediaGroup,
  sendApprovalRequest,
  getApprovalActions,
  answerCallback,
  clearKeyboard,
  sendAdminNote,
};
