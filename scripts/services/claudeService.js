const axios = require('axios');
const config = require('../config');

async function generateCaption({ topic, tone = 'صمیمی و جذاب', contentType = 'post' }) {
  const systemPrompt = `تو یک متخصص تولید محتوای اینستاگرام فارسی هستی.
فقط خروجی JSON معتبر برگردون، بدون هیچ توضیح اضافه یا Markdown.
فرمت خروجی دقیقا این باشد:
{"caption": "متن کپشن", "hashtags": ["#تگ۱", "#تگ۲"]}`;

  const userPrompt = `موضوع محتوا: ${topic}
نوع محتوا: ${contentType}
لحن: ${tone}
یک کپشن جذاب فارسی (حداکثر ۳ پاراگراف کوتاه) و ۸ تا ۱۲ هشتگ مرتبط فارسی/انگلیسی تولید کن.`;

  const response = await axios.post(
    config.claude.endpoint,
    {
      model: config.claude.model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    },
    {
      headers: {
        'x-api-key': config.claude.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const textBlock = response.data.content.find((b) => b.type === 'text');
  const raw = textBlock ? textBlock.text : '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return { caption: raw, hashtags: [] };
  }
}

module.exports = { generateCaption };
