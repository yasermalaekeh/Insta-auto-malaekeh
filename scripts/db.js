const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureDataFile() {
  const dir = path.dirname(config.paths.dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.paths.dataFile)) {
    fs.writeFileSync(config.paths.dataFile, JSON.stringify({ posts: [], telegramUpdateOffset: 0 }, null, 2));
  }
}

function readAll() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(config.paths.dataFile, 'utf-8'));
}

function writeAll(data) {
  ensureDataFile();
  fs.writeFileSync(config.paths.dataFile, JSON.stringify(data, null, 2));
}

function addPost(post) {
  const data = readAll();
  data.posts.push(post);
  writeAll(data);
  return post;
}

function updatePost(id, updates) {
  const data = readAll();
  const idx = data.posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.posts[idx] = { ...data.posts[idx], ...updates };
  writeAll(data);
  return data.posts[idx];
}

function getPostById(id) {
  const data = readAll();
  return data.posts.find((p) => p.id === id) || null;
}

function getPendingPosts() {
  const data = readAll();
  return data.posts.filter((p) => p.status === 'pending');
}

function getAwaitingApprovalPosts() {
  const data = readAll();
  return data.posts.filter((p) => p.status === 'awaiting_approval');
}

function getOffset() {
  const data = readAll();
  return data.telegramUpdateOffset || 0;
}

function setOffset(offset) {
  const data = readAll();
  data.telegramUpdateOffset = offset;
  writeAll(data);
}

module.exports = {
  addPost,
  updatePost,
  getPostById,
  getPendingPosts,
  getAwaitingApprovalPosts,
  getOffset,
  setOffset,
  readAll,
  writeAll,
};
