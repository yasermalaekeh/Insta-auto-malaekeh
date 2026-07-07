const path = require('path');

// در GitHub Actions مقدار GITHUB_REPOSITORY به‌صورت خودکار برابر "owner/repo" است
const repo = process.env.GITHUB_REPOSITORY || 'YOUR_USERNAME/YOUR_REPO';
const branch = process.env.PUBLIC_BRANCH || 'main';

module.exports = {
  repoRoot: path.join(__dirname, '..'),

  rawBaseUrl: `https://raw.githubusercontent.com/${repo}/${branch}`,

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },

  instagram: {
    accessToken: process.env.IG_ACCESS_TOKEN,
    businessAccountId: process.env.IG_BUSINESS_ACCOUNT_ID,
    graphApiVersion: 'v20.0',
    graphBaseUrl: 'https://graph.facebook.com',
  },

  paths: {
    uploads: path.join(__dirname, '..', 'uploads'),
    output: path.join(__dirname, '..', 'output'),
    dataFile: path.join(__dirname, '..', 'data', 'queue.json'),
  },
};
