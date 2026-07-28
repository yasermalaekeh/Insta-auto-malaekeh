const axios = require('axios');
const config = require('../config');

const { botToken, channelUsername } = config.telegram;

function apiUrl(method) {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function publishPhoto({ mediaUrl, caption }) {
  const trimmedCaption = caption && caption.length > 1024
    ? caption.slice(0, 1021) + '...'
    : caption;

  const res = await axios.post(apiUrl('sendPhoto'), {
    chat_id: channelUsername,
    photo: mediaUrl,
    caption: trimmedCaption || '',
  });

  return { messageId: res.data.result.message_id };
}

async function publishMediaGroup({ mediaUrls, caption }) {
  const trimmedCaption = caption && caption.length > 1024
    ? caption.slice(0, 1021) + '...'
    : caption;

  const media = mediaUrls.map((url, i) => ({
    type: 'photo',
    media: url,
    ...(i === 0 ? { caption: trimmedCaption || '' } : {}),
  }));

  const res = await axios.post(apiUrl('sendMediaGroup'), {
    chat_id: channelUsername,
    media,
  });

  return { messageIds: res.data.result.map((m) => m.message_id) };
}

async function editCaption({ messageId, newCaption }) {
  const trimmedCaption = newCaption && newCaption.length > 1024
    ? newCaption.slice(0, 1021) + '...'
    : newCaption;

  await axios.post(apiUrl('editMessageCaption'), {
    chat_id: channelUsername,
    message_id: messageId,
    caption: trimmedCaption || '',
  });
}

async function publishContent({ mediaUrl, mediaUrls, caption }) {
  if (mediaUrls && mediaUrls.length > 1) {
    const result = await publishMediaGroup({ mediaUrls, caption });
    return { messageId: result.messageIds[0], allMessageIds: result.messageIds };
  }
  const result = await publishPhoto({ mediaUrl, caption });
  return { messageId: result.messageId, allMessageIds: [result.messageId] };
}

module.exports = { publishContent, publishPhoto, publishMediaGroup, editCaption };
