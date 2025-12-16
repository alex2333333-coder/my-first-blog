const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create users table with GitHub and Gitee fields
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      github_id TEXT UNIQUE,
      github_name TEXT,
      github_email TEXT,
      github_avatar TEXT,
      github_access_token TEXT,
      github_refresh_token TEXT,
      gitee_id TEXT UNIQUE,
      gitee_name TEXT,
      gitee_email TEXT,
      gitee_avatar TEXT,
      gitee_access_token TEXT,
      gitee_refresh_token TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists.');
    }
  });

  // Create comments table
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating comments table:', err.message);
    } else {
      console.log('Comments table created or already exists.');
    }
  });

  // Create post_likes table with anonymous support
  db.run(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      anonymous_id TEXT,
      post_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      -- Ensure either user_id or anonymous_id is provided
      CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
      -- Ensure unique likes per user or anonymous_id per post
      UNIQUE(user_id, post_id),
      UNIQUE(anonymous_id, post_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating post_likes table:', err.message);
      // If table already exists, try to add anonymous_id column if it doesn't exist
      if (err.message.includes('already exists')) {
        // Try to add anonymous_id column
        db.run("ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS anonymous_id TEXT", (err) => {
          if (err) {
            console.error('Error adding anonymous_id column to post_likes:', err.message);
          } else {
            console.log('Ensured post_likes table has anonymous_id column.');
          }
        });
      }
    } else {
      console.log('Post likes table created.');
    }
  });

  // Create likes table for comments with anonymous support
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      anonymous_id TEXT,
      comment_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (comment_id) REFERENCES comments (id),
      -- Ensure either user_id or anonymous_id is provided
      CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
      -- Ensure unique likes per user or anonymous_id per comment
      UNIQUE(user_id, comment_id),
      UNIQUE(anonymous_id, comment_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating likes table:', err.message);
    } else {
      console.log('Likes table created or already exists.');
    }
  });

  // Create post_stats table for post statistics
  db.run(`
    CREATE TABLE IF NOT EXISTS post_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL UNIQUE,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating post_stats table:', err.message);
    } else {
      console.log('Post stats table created or already exists.');
    }
  });
}

module.exports = db;
