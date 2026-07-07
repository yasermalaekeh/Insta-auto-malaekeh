const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureDataFile() {
  const dir = path.dirname(config.paths.dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.paths.dataFile)) {
    fs.writeFileSync(config.paths.dataFile, JSON.stringify({ posts: [] }, null, 2));
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

function getPendingPosts() {
  const data = readAll();
  const now = new Date().toISOString();
  return data.posts.filter((p) => p.status === 'scheduled' && p.scheduledAt <= now);
}

module.exports = { addPost, updatePost, getPendingPosts, readAll, writeAll };
