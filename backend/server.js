require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your-secret-key-change-this-in-production'; // Change this in production

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
}

// Verify JWT token middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}

// User Registration API
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide username, email, and password' });
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ message: 'Error hashing password' });
    }

    // Insert user into database
    db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Username or email already exists' });
          }
          return res.status(500).json({ message: 'Error registering user' });
        }

        // Get the new user
        db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [this.lastID], (err, user) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting user' });
          }

          // Generate token
          const token = generateToken(user);

          res.status(201).json({
            message: 'User registered successfully',
            user,
            token
          });
        });
      }
    );
  });
});

// User Login API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  // Get user from database
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Error getting user' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare password
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error comparing password' });
      }

      if (!result) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Generate token
      const token = generateToken(user);

      // Return user without password_hash
      const { password_hash, ...userWithoutPassword } = user;

      res.status(200).json({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    });
  });
});

// Get Current User API
app.get('/api/auth/me', verifyToken, (req, res) => {
  db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Error getting user' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  });
});

// Logout API (Client-side should remove the token)
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
});

// Get Comments API with like count
app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;

  db.all(
    `SELECT c.id, c.content, c.created_at, u.id as user_id, u.username, 
           (SELECT COUNT(*) FROM likes l WHERE l.comment_id = c.id) as likes
     FROM comments c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.post_id = ? 
     ORDER BY c.created_at DESC`,
    [postId],
    (err, comments) => {
      if (err) {
        return res.status(500).json({ message: 'Error getting comments' });
      }

      res.status(200).json(comments);
    }
  );
});

// Like Comment API
app.post('/api/comments/:commentId/like', verifyToken, (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  // Check if the comment exists
  db.get('SELECT id FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) {
      return res.status(500).json({ message: 'Error checking comment' });
    }

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Try to add like
    db.run(
      'INSERT OR IGNORE INTO likes (user_id, comment_id) VALUES (?, ?)',
      [userId, commentId],
      function (err) {
        if (err) {
          return res.status(500).json({ message: 'Error liking comment' });
        }

        // Get the updated like count
        db.get('SELECT COUNT(*) as likes FROM likes WHERE comment_id = ?', [commentId], (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting like count' });
          }

          res.status(200).json({
            message: 'Comment liked successfully',
            likes: result.likes
          });
        });
      }
    );
  });
});

// Create Comment API
app.post('/api/comments/:postId', verifyToken, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Please provide comment content' });
  }

  db.run(
    'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
    [req.user.id, postId, content],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Error creating comment' });
      }

      // Get the new comment with user info
      db.get(
        `SELECT c.id, c.content, c.created_at, u.id as user_id, u.username 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [this.lastID],
        (err, comment) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting comment' });
          }

          res.status(201).json({
            message: 'Comment created successfully',
            comment
          });
        }
      );
    }
  );
});

// Like Post API (one-time like, no unlike functionality)
app.post('/api/posts/:postId/like', verifyToken, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  // Check if user already liked the post
  db.get(
    'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
    [userId, postId],
    (err, like) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking like status' });
      }

      if (like) {
        // User already liked the post, return success with current count
        db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting like count' });
          }
          return res.status(200).json({
            message: 'Post already liked',
            likes: result.likes,
            isLiked: true
          });
        });
        return;
      }

      // User hasn't liked, add like
      db.run(
        'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
        [userId, postId],
        function (err) {
          if (err) {
            return res.status(500).json({ message: 'Error liking post' });
          }

          // Get the updated like count
          db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, result) => {
            if (err) {
              return res.status(500).json({ message: 'Error getting like count' });
            }

            // Update post_stats table
            db.run(
              'INSERT OR REPLACE INTO post_stats (post_id, likes, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
              [postId, result.likes],
              (err) => {
                if (err) {
                  console.error('Error updating post stats:', err);
                  // Continue anyway, don't fail the request
                }
              }
            );

            res.status(200).json({
              message: 'Post liked successfully',
              likes: result.likes,
              isLiked: true
            });
          });
        }
      );
    }
  );
});

// Get Post Statistics API with like status for current user
app.get('/api/posts/:postId/stats', (req, res) => {
  const { postId } = req.params;
  const token = req.headers['authorization']?.split(' ')[1];
  let userId = null;

  // Try to decode token if present
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.id;
    } catch (err) {
      // Invalid token, continue without userId
      console.error('Invalid token:', err.message);
    }
  }

  // Get like count
  db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, likeResult) => {
    if (err) {
      return res.status(500).json({ message: 'Error getting like count' });
    }

    // Check if current user liked this post
    const checkLikeStatus = userId ? 
      db.get('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId], (err, like) => {
        if (err) {
          return res.status(500).json({ message: 'Error checking like status' });
        }
        
        const isLiked = !!like;
        continueWithStats(isLiked);
      }) :
      continueWithStats(false);

    // Helper function to continue with stats calculation
    function continueWithStats(isLiked) {
      // Get comment count
      db.get('SELECT COUNT(*) as comments FROM comments WHERE post_id = ?', [postId], (err, commentResult) => {
        if (err) {
          return res.status(500).json({ message: 'Error getting comment count' });
        }

        // Get view count from post_stats
        db.get('SELECT views FROM post_stats WHERE post_id = ?', [postId], (err, viewResult) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting view count' });
          }

          const stats = {
            likes: likeResult.likes || 0,
            comments: commentResult.comments || 0,
            views: viewResult?.views || 0,
            isLiked: isLiked
          };

          res.status(200).json(stats);
        });
      });
    }
  });
});

// Increment Post View Count API
app.put('/api/posts/:postId/views', (req, res) => {
  const { postId } = req.params;

  // Update view count in post_stats table
  db.run(
    `INSERT INTO post_stats (post_id, views, updated_at)
     VALUES (?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(post_id) DO UPDATE SET
     views = views + 1,
     updated_at = CURRENT_TIMESTAMP`,
    [postId],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Error updating view count' });
      }

      // Get updated view count
      db.get('SELECT views FROM post_stats WHERE post_id = ?', [postId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error getting updated view count' });
        }

        res.status(200).json({
          message: 'View count updated successfully',
          views: result.views
        });
      });
    }
  );
});

// Get Multiple Post Statistics API (for homepage)
app.get('/api/posts/stats', (req, res) => {
  let { postIds } = req.query;
  if (!postIds) {
    return res.status(400).json({ message: 'Please provide postIds parameter' });
  }

  console.log('Received postIds query parameter:', postIds);
  
  // Split and trim the postIds array
  const postIdArray = postIds.split(',').map(id => id.trim());
  console.log('Processed postIds array:', postIdArray);

  // Get stats for all requested posts
  const statsPromises = postIdArray.map(postId => {
    console.log('Getting stats for postId:', postId);
    return new Promise((resolve, reject) => {
      // First, get like count
      db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, likeResult) => {
        if (err) {
          console.error('Error getting likes for postId', postId, ':', err);
          reject(err);
          return;
        }

        // Then, get comment count
        db.get('SELECT COUNT(*) as comments FROM comments WHERE post_id = ?', [postId], (err, commentResult) => {
          if (err) {
            console.error('Error getting comments for postId', postId, ':', err);
            reject(err);
            return;
          }

          // Finally, get view count
          db.get('SELECT views FROM post_stats WHERE post_id = ?', [postId], (err, viewResult) => {
            if (err) {
              console.error('Error getting views for postId', postId, ':', err);
              reject(err);
              return;
            }

            // Create the result object
            const result = {
              postId,
              likes: likeResult.likes || 0,
              comments: commentResult.comments || 0,
              views: viewResult?.views || 0
            };
            console.log('Stats for postId', postId, ':', result);
            resolve(result);
          });
        });
      });
    });
  });

  Promise.all(statsPromises)
    .then(stats => {
      // Create an object with postId as key for easy lookup
      const statsObj = stats.reduce((acc, stat) => {
        acc[stat.postId] = stat;
        return acc;
      }, {});
      console.log('Final stats object:', statsObj);
      res.status(200).json(statsObj);
    })
    .catch(err => {
      console.error('Error getting multiple post stats:', err);
      res.status(500).json({ message: 'Error getting post statistics' });
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
