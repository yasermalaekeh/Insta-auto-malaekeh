const axios = require('axios');
const config = require('../config');

const { graphBaseUrl, graphApiVersion, accessToken, businessAccountId } = config.instagram;

function apiUrl(pathSegment) {
  return `${graphBaseUrl}/${graphApiVersion}/${pathSegment}`;
}

async function createMediaContainer({ mediaUrl, caption, mediaType }) {
  const params = { access_token: accessToken, caption: caption || '' };

  if (mediaType === 'REELS') {
    params.media_type = 'REELS';
    params.video_url = mediaUrl;
  } else if (mediaType === 'STORIES') {
    params.media_type = 'STORIES';
    if (/\.(mp4|mov)$/i.test(mediaUrl)) {
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }
  } else {
    params.image_url = mediaUrl;
  }

  const res = await axios.post(apiUrl(`${businessAccountId}/media`), null, { params });
  return res.data.id;
}

async function waitForContainerReady(creationId, { retries = 20, delayMs = 5000 } = {}) {
  for (let i = 0; i < retries; i++) {
    const res = await axios.get(apiUrl(creationId), {
      params: { fields: 'status_code,status', access_token: accessToken },
    });
    if (res.data.status_code === 'FINISHED') return true;
    if (res.data.status_code === 'ERROR') {
      throw new Error('پردازش رسانه در اینستاگرام با خطا مواجه شد: ' + JSON.stringify(res.data));
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error('زمان انتظار برای آماده شدن رسانه به پایان رسید');
}

async function publishMediaContainer(creationId) {
  const res = await axios.post(apiUrl(`${businessAccountId}/media_publish`), null, {
    params: { creation_id: creationId, access_token: accessToken },
  });
  return res.data.id;
}

async function publishContent({ mediaUrl, caption, mediaType }) {
  const creationId = await createMediaContainer({ mediaUrl, caption, mediaType });
  if (mediaType === 'REELS') {
    await waitForContainerReady(creationId);
  }
  const mediaId = await publishMediaContainer(creationId);
  return { creationId, mediaId };
}

module.exports = { createMediaContainer, waitForContainerReady, publishMediaContainer, publishContent };
