const axios = require('axios');
const config = require('../config');
const priceService = require('./priceService');

const { apiKey, model, endpoint } = config.claude;

async function generateCaption(specs) {
  const {
    productCode,
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
  let laborTier = null;

  if (!finalPrice && laborFeeValue !== undefined && laborFeeValue !== null && weight && karat) {
    priceBreakdown = await priceService.calculateFinalPrice({ weight, karat, laborFeeType, laborFeeValue });
    finalPrice = priceBreakdown.finalPrice;

    const effectiveLaborPercent = (priceBreakdown.laborFee / priceBreakdown.basePrice) * 100;
    if (effectiveLaborPercent >= 16) {
      laborTier = 'لوکس';
    } else if (effectiveLaborPercent >= 10) {
      laborTier = 'متوسط';
    } else {
      laborTier = 'اقتصادی';
    }
  }

  const detailsLines = [];
  if (productCode) detailsLines.push(`کد محصول: ${productCode}`);
  detailsLines.push(`نوع محصول: ${productType || 'نامشخص'}`);
  detailsLines.push(`وزن: ${weight ? weight + ' گرم' : 'نامشخص'}`);
  detailsLines.push(`عیار: ${karat ? karat + ' عیار' : 'نامشخص'}`);
  if (stoneType) detailsLines.push(`نوع سنگ: ${stoneType}`);
  if (style) detailsLines.push(`سبک: ${style}`);
  if (laborTier) detailsLines.push(`اجرت ساخت: ${laborTier}`);
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
- مشخصات کلیدی (کد محصول، وزن، عیار، و قیمت در صورت وجود) همگی باید در همان سطرهای ابتدایی کپشن (نه انتها، نه بعد از هشتگ‌ها) به‌صورت واضح و طبیعی ذکر شوند، چون بخشی جدایی‌ناپذیر از معرفی محصول هستند
- کد محصول را دقیقاً همان‌طور که داده شده (مثلاً MG-014) بدون تغییر در متن بیاور؛ این کد برای استعلام قیمت توسط مشتریان استفاده می‌شود
- هرگز عدد یا درصد واقعی اجرت ساخت را در کپشن ذکر نکن؛ فقط عبارت «اجرت ساخت: لوکس» یا «اجرت ساخت: متوسط» یا «اجرت ساخت: اقتصادی» (دقیقاً با همین کلمه‌ی «اجرت ساخت») را به‌صورت طبیعی در متن بیاور، بدون اشاره به این‌که این سطح چگونه محاسبه شده
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
