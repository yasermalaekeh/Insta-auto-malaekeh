const axios = require('axios');
const config = require('../config');
const priceService = require('./priceService');

const { apiKey, model, endpoint } = config.claude;

async function generateCaption(specs) {
  const {
    productType,
    weight,
    karat,
    laborFeeType,
    laborFeeValue,
    stoneType,
    style,
    price,
    extraNotes,
  } = specs;

  let finalPrice = price;
  let priceBreakdown = null;

  if (!finalPrice && laborFeeValue !== undefined && laborFeeValue !== null && weight && karat) {
    priceBreakdown = await priceService.calculateFinalPrice({ weight, karat, laborFeeType, laborFeeValue });
    finalPrice = priceBreakdown.finalPrice;
  }

  const detailsLines = [
    `نوع محصول: ${productType || 'نامشخص'}`,
    `وزن: ${weight ? weight + ' گرم' : 'نامشخص'}`,
    `عیار: ${karat ? karat + ' عیار' : 'نامشخص'}`,
  ];
  if (stoneType) detailsLines.push(`نوع سنگ: ${stoneType}`);
  if (style) detailsLines.push(`سبک: ${style}`);
  if (finalPrice) detailsLines.push(`قیمت نهایی (شامل اجرت، سود و مالیات): ${Math.round(finalPrice).toLocaleString('fa-IR')} تومان`);
  if (extraNotes) detailsLines.push(`توضیحات اضافه: ${extraNotes}`);

  const prompt = `تو یک کپشن‌نویس حرفه‌ای برای یک برند طلا و جواهرات (ملائکه گلد گالری) در اینستاگرام هستی
و همیشه شیوه‌های به‌روز الگوریتم و بهترین‌شیوه‌های تعامل در اینستاگرام را رعایت می‌کنی.

مشخصات محصول:
${detailsLines.join('\n')}

اصول کپشن‌نویسی (مطابق شیوه‌های فعلی الگوریتم اینستاگرام):
- خط اول کپشن باید یک قلاب (hook) قوی باشد، چون فقط همان در پیش‌نمایش دیده می‌شود؛ مستقیم با توصیف محصول یا یک جمله جذاب شروع شود، نه با احوال‌پرسی
- لحن شیک، گرم و مطمئن؛ نه اغراق‌آمیز و نه فروشنده‌مآبانه
- حداکثر ۴-۵ خط اصلی
- مشخصات کلیدی (وزن، عیار، و قیمت در صورت وجود) به‌طور طبیعی در متن بیاید
- در پایان یک دعوت به تعامل کوتاه بگذار (مثلاً پرسیدن نظر یا ذخیره پست) چون الگوریتم فعلی به ذخیره و کامنت بیشتر از لایک اهمیت می‌دهد
- به‌جای هشتگ‌های عمومی و پرتعداد، فقط ۵ تا ۸ هشتگ دقیق و مرتبط با جواهرات/طلا/محصول بگذار؛ هشتگ‌های انبوه و نامرتبط باعث کاهش بازدید می‌شود
- از ایموجی‌های مناسب (طلا، الماس، جواهر) به‌اندازه استفاده کن، نه زیاد
- فقط متن نهایی کپشن را برگردان، بدون توضیح اضافه یا مقدمه`;

  const response = await axios.post(
    endpoint,
    {
      model: model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const caption = response.data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { caption, priceBreakdown };
}

module.exports = { generateCaption };
