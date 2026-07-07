const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./db');
const claudeService = require('./services/claudeService');
const videoService = require('./services/videoService');

const TYPE_MAP = {
  'پست ساده (فید)': 'IMAGE',
  'ریلز (ویدیو از چند عکس)': 'REELS',
  'استوری': 'STORIES',
};

function parseIssueBody(body) {
  const fields = {};
  const blocks = body.split(/^###\s+/m).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    const label = lines[0].trim();
    const value = lines.slice(1).join('\n').trim();
    fields[label] = value === '_No response_' ? '' : value;
  }
  return fields;
}

async function main() {
  const issueBody = process.env.ISSUE_BODY || '';
  const issueNumber = process.env.ISSUE_NUMBER || '';

  const fields = parseIssueBody(issueBody);

  const contentTypeRaw = fields['نوع محتوا'];
  const type = TYPE_MAP[contentTypeRaw];
  if (!type) {
    throw new Error(`نوع محتوا شناسایی نشد: "${contentTypeRaw}"`);
  }

  const imagesRaw = fields['نام فایل‌های عکس'] || '';
  const filenames = imagesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (filenames.length === 0) {
    throw new Error('هیچ نام فایل عکسی وارد نشده است');
  }

  for (const fname of filenames) {
    const fpath = path.join(config.paths.uploads, fname);
    if (!fs.existsSync(fpath)) {
      throw new Error(
        `فایل "${fname}" در پوشه uploads پیدا نشد. لطفاً ابتدا عکس را از طریق گیت‌هاب آپلود کنید.`
      );
    }
  }

  const topic = fields['موضوع محتوا'] || '';
  const tone = fields['لحن'] || 'صمیمی و جذاب';
  const scheduledAtRaw = (fields['زمان انتشار (اختیاری)'] || '').trim();
  const scheduledAt = scheduledAtRaw || new Date().toISOString();

  let mediaUrl;
  if (type === 'REELS') {
    const videoPath = await videoService.buildReelFromImages({
      imagePaths: filenames.map((f) => path.join(config.paths.uploads, f)),
      secondsPerImage: 3,
    });
    const videoFilename = path.basename(videoPath);
    mediaUrl = `${config.rawBaseUrl}/output/${videoFilename}`;
  } else {
    mediaUrl = `${config.rawBaseUrl}/uploads/${filenames[0]}`;
  }

  let caption = '';
  if (type !== 'STORIES') {
    const result = await claudeService.generateCaption({
      topic,
      tone,
      contentType: type.toLowerCase(),
    });
    caption = `${result.caption}\n\n${(result.hashtags || []).join(' ')}`;
  }

  const { v4: uuidv4 } = require('uuid');
  const post = db.addPost({
    id: uuidv4(),
    type,
    mediaUrl,
    caption,
    status: 'scheduled',
    scheduledAt,
    createdAt: new Date().toISOString(),
    sourceIssue: issueNumber,
  });

  console.log('✅ پست به صف اضافه شد:', post.id);

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `post_id=${post.id}\n`);
    fs.appendFileSync(outputFile, `scheduled_at=${scheduledAt}\n`);
    fs.appendFileSync(outputFile, `media_type=${type}\n`);
  }
}

main().catch((err) => {
  console.error('❌ خطا:', err.message);
  process.exit(1);
});
