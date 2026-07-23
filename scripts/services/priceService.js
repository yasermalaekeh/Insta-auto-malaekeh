const axios = require('axios');
const config = require('../config');

const { apiKey, model, endpoint } = config.claude;

const BASE_KARAT_PURITY = 750;
const KARAT_PURITY = { '18': 750, '21': 875, '24': 999 };

const PROFIT_RATE = 0.07;
const VAT_RATE = 0.10;

async function fetchGoldPricePerGram() {
  const response = await axios.post(
    endpoint,
    {
      model: model,
      max_tokens: 300,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content:
            'قیمت لحظه‌ای هر گرم طلای ۱۸ عیار (طلای آب‌شده / مظنه بازار تهران) به تومان چقدر است؟ ' +
            'جست‌وجوی وب انجام بده و فقط عدد نهایی را به تومان و بدون کاما یا واحد اضافه، در یک خط برگردان. مثال خروجی: 6850000',
        },
      ],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const text = response.data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join(' ');

  const match = text.replace(/,/g, '').match(/(\d{6,9})/);
  if (!match) {
    throw new Error('قیمت طلا از پاسخ جست‌وجوی وب قابل استخراج نبود: ' + text);
  }
  return parseInt(match[1], 10);
}

async function calculateFinalPrice({ weight, karat, laborFee, goldPricePerGram18 }) {
  if (!weight || !karat || laborFee === undefined || laborFee === null) {
    throw new Error('وزن، عیار و اجرت ساخت برای محاسبه قیمت الزامی است.');
  }

  const purity = KARAT_PURITY[String(karat)] || BASE_KARAT_PURITY;
  const price18 = goldPricePerGram18 || (await fetchGoldPricePerGram());
  const pricePerGram = Math.round(price18 * (purity / BASE_KARAT_PURITY));

  const basePrice = Math.round(weight * pricePerGram);
  const subtotalBeforeProfit = basePrice + laborFee;
  const profit = Math.round(subtotalBeforeProfit * PROFIT_RATE);
  const vatBase = laborFee + profit;
  const vat = Math.round(vatBase * VAT_RATE);
  const finalPrice = basePrice + laborFee + profit + vat;

  return {
    goldPricePerGram18: price18,
    pricePerGramForKarat: pricePerGram,
    basePrice,
    laborFee,
    profit,
    vat,
    finalPrice,
  };
}

module.exports = { fetchGoldPricePerGram, calculateFinalPrice };
