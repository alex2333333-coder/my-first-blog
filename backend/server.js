require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your-secret-key-change-this-in-production'; // Change this in production
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to send login response with raw third-party info
function sendLoginResponse(res, token, user, rawUserInfo = {}) {
  try {
    // Prepare a simple HTML response
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>登录成功</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 50px auto;
            max-width: 600px;
            background-color: #f0f2f5;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #27ae60;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background-color: #27ae60;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 10px;
            transition: background-color 0.3s;
          }
          .btn:hover {
            background-color: #229954;
          }
          .redirect-text {
            color: #666;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>登录成功！</h1>
          <p>欢迎回来，${user.username}！</p>
          <div>
            <a href="${FRONTEND_URL}?login=success&username=${user.username}&token=${token}" class="btn">立即返回首页</a>
          </div>
          <p class="redirect-text">3秒后自动跳转至首页...</p>
        </div>
        <script>
          // Save token to localStorage
          localStorage.removeItem('blog-jwt');
          localStorage.setItem('blog-jwt', '${token}');
          
          // Simple auto redirect
          setTimeout(function() {
            window.location.href = '${FRONTEND_URL}?login=success&username=${user.username}&token=${token}';
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error in sendLoginResponse:', error);
    // Fallback response
    res.status(200).send(`
      <html>
      <body>
        <h1>登录成功！</h1>
        <p>欢迎回来，${user.username}！</p>
        <a href="${FRONTEND_URL}?login=success&username=${user.username}&token=${token}">点击返回首页</a>
      </body>
      </html>
    `);
  }
}

// GitHub OAuth Routes

// Store state in memory for CSRF protection (in production, use a secure session store)
const stateStore = new Map();

// GitHub Login Redirect
app.get('/api/auth/github', (req, res) => {
  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state with expiration (10 minutes)
  const expiresAt = Date.now() + 10 * 60 * 1000;
  stateStore.set(state, expiresAt);
  
  // Debug: Log environment variables
  console.log('GitHub OAuth Debug:');
  console.log('  Client ID:', process.env.GITHUB_CLIENT_ID);
  console.log('  Callback URL:', process.env.GITHUB_CALLBACK_URL);
  
  // Redirect to GitHub authorization endpoint
  // Don't use Device Flow, use standard authorization code flow
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(process.env.GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL)}&scope=user:email&state=${encodeURIComponent(state)}&response_type=code`;
  
  console.log('  Generated Auth URL:', githubAuthUrl);
  
  res.redirect(githubAuthUrl);
});

// GitHub Callback Handler
app.get('/api/auth/github/callback', (req, res) => {
  console.log('📥 Received GitHub callback request!');
  console.log('Request URL:', req.url);
  console.log('Request query params:', req.query);
  console.log('Request headers:', req.headers);
  
  const { code, state } = req.query;
  
  // Validate state parameter for CSRF protection
  if (!state || !stateStore.has(state)) {
    console.error('❌ Invalid or missing state parameter');
    return res.status(400).json({ error: 'Invalid or missing state parameter' });
  }
  
  // Check if state has expired
  const expiresAt = stateStore.get(state);
  if (Date.now() > expiresAt) {
    console.error('❌ State parameter has expired');
    stateStore.delete(state);
    return res.status(400).json({ error: 'State parameter has expired' });
  }
  
  // Remove state from store after use
  stateStore.delete(state);
  
  // Check if code is provided
  if (!code) {
    console.error('❌ Missing authorization code');
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  
  console.log('✅ Callback request validation passed!');
  console.log('📋 Authorization code:', code);
  
  // Exchange code for access token
  const postData = querystring.stringify({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code: code,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    grant_type: 'authorization_code'
  });
  
  const options = {
    hostname: 'github.com',
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json'
    }
  };
  
  const tokenReq = https.request(options, (tokenRes) => {
    let data = '';
    
    tokenRes.on('data', (chunk) => {
      data += chunk;
    });
    
    tokenRes.on('end', () => {
      // Check if response is successful
      if (tokenRes.statusCode !== 200) {
        return res.status(500).json({ 
          error: 'GitHub token exchange failed', 
          statusCode: tokenRes.statusCode,
          body: data 
        });
      }
      
      // Parse token response
      let tokenData;
      try {
        tokenData = JSON.parse(data);
      } catch (parseError) {
        return res.status(500).json({ 
          error: 'Failed to parse GitHub token response',
          details: parseError.message 
        });
      }
      
      if (tokenData.error) {
        return res.status(400).json({ 
          error: tokenData.error, 
          error_description: tokenData.error_description || 'No error description provided'
        });
      }
      
      if (!tokenData.access_token) {
        return res.status(500).json({ error: 'GitHub did not return an access token' });
      }
      
      // Get user data using access token
      const userOptions = {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'User-Agent': 'Node.js App',
          'Accept': 'application/json'
        }
      };
      
      const userReq = https.get(userOptions, (userRes) => {
        let userData = '';
        
        userRes.on('data', (chunk) => {
          userData += chunk;
        });
        
        userRes.on('end', () => {
          // Check if response is successful
          if (userRes.statusCode !== 200) {
            return res.status(500).json({ 
              error: 'Failed to fetch GitHub user data', 
              statusCode: userRes.statusCode,
              body: userData 
            });
          }
          
          // Parse user data
          let githubUser;
          try {
            githubUser = JSON.parse(userData);
          } catch (parseError) {
            return res.status(500).json({ 
              error: 'Failed to parse GitHub user data',
              details: parseError.message 
            });
          }
          
          if (!githubUser.id) {
            return res.status(500).json({ error: 'GitHub user data is incomplete' });
          }
          
          // Get user email
          const emailOptions = {
            hostname: 'api.github.com',
            path: '/user/emails',
            method: 'GET',
            headers: {
              'Authorization': `token ${tokenData.access_token}`,
              'User-Agent': 'Node.js App',
              'Accept': 'application/json'
            }
          };
          
          const emailReq = https.get(emailOptions, (emailRes) => {
            let emailData = '';
            
            emailRes.on('data', (chunk) => {
              emailData += chunk;
            });
            
            emailRes.on('end', () => {
              // Extract user information from GitHub response
              const username = githubUser.name || githubUser.login; // Prefer name over login if available
              let primaryEmail = githubUser.email;
              
              console.log('GitHub user info:');
              console.log('  ID:', githubUser.id);
              console.log('  Login:', githubUser.login);
              console.log('  Name:', githubUser.name);
              console.log('  Email from user_info:', primaryEmail);
              
              // Parse email data if response is successful
              if (emailRes.statusCode === 200) {
                try {
                  const emails = JSON.parse(emailData);
                  if (Array.isArray(emails) && emails.length > 0) {
                    // Get the primary email or first email available
                    const primary = emails.find(email => email.primary && email.verified);
                    primaryEmail = primary?.email || emails.find(e => e.verified)?.email || emails[0].email || githubUser.email;
                    console.log('Selected GitHub email from emails API:', primaryEmail);
                  }
                } catch (err) {
                  console.error('Error parsing GitHub emails:', err);
                }
              } else {
                console.warn('Failed to fetch GitHub user emails, status code:', emailRes.statusCode);
              }
              
              // Ensure we have a valid email
              if (!primaryEmail || primaryEmail === null || primaryEmail.includes('@example.com')) {
                // Fallback to username@example.com if no real email found
                primaryEmail = githubUser.login + '@example.com';
                console.log('Using fallback email:', primaryEmail);
              }
              
              console.log('Final username:', username);
              console.log('Final email:', primaryEmail);
              
              // Find or create user in database
              db.get('SELECT * FROM users WHERE github_id = ?', [githubUser.id], (err, user) => {
                if (err) {
                  console.error('Database error when finding user:', err);
                  return res.status(500).json({ error: 'Database error' });
                }
                
                if (user) {
                  // Update existing user
                  db.run(
                    `UPDATE users SET 
                      username = ?, 
                      email = ?, 
                      github_name = ?, 
                      github_email = ?, 
                      github_avatar = ?, 
                      github_access_token = ?, 
                      updated_at = CURRENT_TIMESTAMP 
                    WHERE github_id = ?`,
                    [username, primaryEmail, githubUser.login, primaryEmail, githubUser.avatar_url, tokenData.access_token, githubUser.id],
                    (err) => {
                      if (err) {
                        console.error('Database error when updating user:', err);
                        return res.status(500).json({ error: 'Database error' });
                      }
                      
                      // Get updated user
                      db.get('SELECT * FROM users WHERE github_id = ?', [githubUser.id], (err, updatedUser) => {
                        if (err) {
                          console.error('Database error when getting updated user:', err);
                          return res.status(500).json({ error: 'Database error' });
                        }
                        
                        // Generate JWT token
                        const token = generateToken(updatedUser);
                        sendLoginResponse(res, token, updatedUser, githubUser);
                      });
                    }
                  );
                } else {
                  // Create new user with GitHub information
                  db.run(
                    `INSERT INTO users 
                      (username, email, github_id, github_name, github_email, github_avatar, github_access_token, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [username, primaryEmail, githubUser.id, githubUser.login, primaryEmail, githubUser.avatar_url, tokenData.access_token],
                    function(err) {
                      if (err) {
                        console.error('Database error when inserting user:', err);
                        return res.status(500).json({ error: 'Database error' });
                      }
                      
                      // Get newly created user
                      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                        if (err) {
                          console.error('Database error when getting new user:', err);
                          return res.status(500).json({ error: 'Database error' });
                        }
                        
                        // Generate JWT token
                        const token = generateToken(newUser);
                        sendLoginResponse(res, token, newUser, githubUser);
                      });
                    }
                  );
                }
              });
            });
          });
          
          emailReq.on('error', (error) => {
            console.error('Error fetching GitHub user emails:', error);
            // Continue with basic user info even if emails fetch fails
            handleGitHubUserInfo(githubUser, tokenData.access_token, res);
          });
        });
      });
      
      userReq.on('error', (error) => {
        console.error('Error fetching GitHub user data:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub user data', details: error.message });
      });
    });
  });
  
  tokenReq.on('error', (error) => {
    console.error('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Failed to exchange code for token', details: error.message });
  });
  
  tokenReq.write(postData);
  tokenReq.end();
});

// Helper function to handle GitHub user info when email fetch fails
function handleGitHubUserInfo(githubUser, accessToken, res) {
  // Extract user information from GitHub response
  const username = githubUser.name || githubUser.login;
  let primaryEmail = githubUser.email;
  
  // Ensure we have a valid email
  if (!primaryEmail || primaryEmail === null || primaryEmail.includes('@example.com')) {
    primaryEmail = githubUser.login + '@example.com';
    console.log('Using fallback email:', primaryEmail);
  }
  
  // Find or create user in database
  db.get('SELECT * FROM users WHERE github_id = ?', [githubUser.id], (err, user) => {
    if (err) {
      console.error('Database error when finding user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (user) {
      // Update existing user
      db.run(
        `UPDATE users SET 
          username = ?, 
          email = ?, 
          github_name = ?, 
          github_email = ?, 
          github_avatar = ?, 
          github_access_token = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE github_id = ?`,
        [username, primaryEmail, githubUser.login, primaryEmail, githubUser.avatar_url, accessToken, githubUser.id],
        (err) => {
          if (err) {
            console.error('Database error when updating user:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Get updated user
          db.get('SELECT * FROM users WHERE github_id = ?', [githubUser.id], (err, updatedUser) => {
            if (err) {
              console.error('Database error when getting updated user:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            // Generate JWT token
            const token = generateToken(updatedUser);
            sendLoginResponse(res, token, updatedUser, githubUser);
          });
        }
      );
    } else {
      // Create new user with GitHub information
      db.run(
        `INSERT INTO users 
          (username, email, github_id, github_name, github_email, github_avatar, github_access_token, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [username, primaryEmail, githubUser.id, githubUser.login, primaryEmail, githubUser.avatar_url, accessToken],
        function(err) {
          if (err) {
            console.error('Database error when inserting user:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Get newly created user
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
            if (err) {
              console.error('Database error when getting new user:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            // Generate JWT token
            const token = generateToken(newUser);
            sendLoginResponse(res, token, newUser, githubUser);
          });
        }
      );
    }
  });
}

// Gitee OAuth Routes

// Gitee Login Redirect
app.get('/api/auth/gitee', (req, res) => {
  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  
  // Redirect to Gitee authorization endpoint with correct scope
  const giteeAuthUrl = `https://gitee.com/oauth/authorize?${querystring.stringify({
    client_id: process.env.GITEE_CLIENT_ID,
    redirect_uri: process.env.GITEE_CALLBACK_URL,
    scope: 'user_info',
    state: state,
    response_type: 'code'
  })}`;
  
  res.redirect(giteeAuthUrl);
});

// Gitee Callback Handler
app.get('/api/auth/gitee/callback', (req, res) => {
  const { code, state } = req.query;
  
  // Exchange code for access token
  const postData = querystring.stringify({
    client_id: process.env.GITEE_CLIENT_ID,
    client_secret: process.env.GITEE_CLIENT_SECRET,
    code: code,
    redirect_uri: process.env.GITEE_CALLBACK_URL,
    grant_type: 'authorization_code'
  });
  
  const options = {
    hostname: 'gitee.com',
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json'
    }
  };
  
  const tokenReq = https.request(options, (tokenRes) => {
    let data = '';
    
    tokenRes.on('data', (chunk) => {
      data += chunk;
    });
    
    tokenRes.on('end', () => {
      const tokenData = JSON.parse(data);
      
      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error, error_description: tokenData.error_description });
      }
      
      // Get user data using access token
      const userOptions = {
        hostname: 'gitee.com',
        path: '/api/v5/user',
        method: 'GET',
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      };
      
      https.get(userOptions, (userRes) => {
        let userData = '';
        
        userRes.on('data', (chunk) => {
          userData += chunk;
        });
        
        userRes.on('end', () => {
          const giteeUser = JSON.parse(userData);
          
          // Extract user information from Gitee response
          const username = giteeUser.name || giteeUser.login; // Prefer name over login if available
          let primaryEmail = giteeUser.email;
          const avatarUrl = giteeUser.avatar_url;
          
          console.log('Gitee user info:');
          console.log('  ID:', giteeUser.id);
          console.log('  Login:', giteeUser.login);
          console.log('  Name:', giteeUser.name);
          console.log('  Email:', primaryEmail);
          
          // Ensure we have a valid email
          if (!primaryEmail || primaryEmail === null || primaryEmail.includes('@example.com')) {
            // Fallback to username@example.com if no real email found
            primaryEmail = giteeUser.login + '@example.com';
            console.log('Using fallback email:', primaryEmail);
          }
          
          console.log('Final username:', username);
          console.log('Final email:', primaryEmail);
          
          // Find or create user in database
          db.get('SELECT * FROM users WHERE gitee_id = ?', [giteeUser.id], (err, user) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            if (user) {
              // Update existing user
              db.run(
                `UPDATE users SET 
                  username = ?, 
                  email = ?, 
                  gitee_name = ?, 
                  gitee_email = ?, 
                  gitee_avatar = ?, 
                  gitee_access_token = ? 
                WHERE gitee_id = ?`,
                [username, primaryEmail, giteeUser.login, primaryEmail, avatarUrl, tokenData.access_token, giteeUser.id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }
                  
                  // Get updated user
                  db.get('SELECT * FROM users WHERE gitee_id = ?', [giteeUser.id], (err, updatedUser) => {
                    if (err) {
                      return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Generate JWT token
                    const token = generateToken(updatedUser);
                    sendLoginResponse(res, token, updatedUser, giteeUser);
                  });
                }
              );
            } else {
              // Create new user with Gitee information
              db.run(
                `INSERT INTO users 
                  (username, email, gitee_id, gitee_name, gitee_email, gitee_avatar, gitee_access_token) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [username, primaryEmail, giteeUser.id, giteeUser.login, primaryEmail, avatarUrl, tokenData.access_token],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }
                  
                  // Get newly created user
                  db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                    if (err) {
                      return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Generate JWT token
                    const token = generateToken(newUser);
                    sendLoginResponse(res, token, newUser, giteeUser);
                  });
                }
              );
            }
          });
        });
      });
    });
  });
  
  tokenReq.on('error', (error) => {
    res.status(500).json({ error: 'Request error', details: error.message });
  });
  
  tokenReq.write(postData);
  tokenReq.end();
});

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

// Like Comment API - supports anonymous likes
app.post('/api/comments/:commentId/like', (req, res) => {
  const { commentId } = req.params;
  const token = req.headers['authorization']?.split(' ')[1];
  let userId = null;
  let anonymousId = req.body.anonymous_id;

  // Try to decode token if present
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.id;
    } catch (err) {
      // Invalid token, continue with anonymous like if anonymousId is provided
      console.error('Invalid token:', err.message);
    }
  }

  // Validate that either userId or anonymousId is provided
  if (!userId && !anonymousId) {
    return res.status(400).json({ message: 'Either userId or anonymousId is required' });
  }

  // Check if the comment exists
  db.get('SELECT id FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) {
      return res.status(500).json({ message: 'Error checking comment' });
    }

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Try to add like
    let insertQuery;
    let insertParams;
    
    if (userId) {
      // Insert for logged-in user
      insertQuery = 'INSERT OR IGNORE INTO likes (user_id, comment_id) VALUES (?, ?)';
      insertParams = [userId, commentId];
    } else {
      // Insert for anonymous user
      insertQuery = 'INSERT OR IGNORE INTO likes (anonymous_id, comment_id) VALUES (?, ?)';
      insertParams = [anonymousId, commentId];
    }

    db.run(insertQuery, insertParams, function (err) {
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
    });
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

// Like Post API (one-time like, no unlike functionality) - supports anonymous likes
app.post('/api/posts/:postId/like', (req, res) => {
  const { postId } = req.params;
  const token = req.headers['authorization']?.split(' ')[1];
  let userId = null;
  let anonymousId = req.body.anonymous_id;

  console.log(`[LIKE API] Received like request for post: ${postId}`);
  console.log(`[LIKE API] Token: ${token ? 'Present' : 'Absent'}`);
  console.log(`[LIKE API] Anonymous ID: ${anonymousId}`);

  // Try to decode token if present
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.id;
      console.log(`[LIKE API] Logged-in user ID: ${userId}`);
    } catch (err) {
      // Invalid token, continue with anonymous like if anonymousId is provided
      console.error('[LIKE API] Invalid token:', err.message);
    }
  }

  // Validate that either userId or anonymousId is provided
  if (!userId && !anonymousId) {
    console.error('[LIKE API] No userId or anonymousId provided');
    return res.status(400).json({ message: 'Either userId or anonymousId is required' });
  }

  // Check if user already liked the post
  let checkQuery;
  let checkParams;
  
  if (userId) {
    // Check for logged-in user
    checkQuery = 'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?';
    checkParams = [userId, postId];
    console.log(`[LIKE API] Checking if logged-in user ${userId} already liked post ${postId}`);
  } else {
    // Check for anonymous user
    checkQuery = 'SELECT id FROM post_likes WHERE anonymous_id = ? AND post_id = ?';
    checkParams = [anonymousId, postId];
    console.log(`[LIKE API] Checking if anonymous user ${anonymousId} already liked post ${postId}`);
  }

  db.get(checkQuery, checkParams, (err, like) => {
    if (err) {
      console.error('[LIKE API] Error checking like status:', err.message);
      return res.status(500).json({ message: 'Error checking like status', error: err.message });
    }

    if (like) {
      // User already liked the post, return success with current count
      console.log(`[LIKE API] User already liked post ${postId}`);
      db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, result) => {
        if (err) {
          console.error('[LIKE API] Error getting like count:', err.message);
          return res.status(500).json({ message: 'Error getting like count' });
        }
        const likes = result.likes || 0;
        console.log(`[LIKE API] Returning current like count: ${likes}`);
        return res.status(200).json({
          message: 'Post already liked',
          likes: likes,
          isLiked: true
        });
      });
      return;
    }

    // User hasn't liked, add like
    let insertQuery;
    let insertParams;
    
    if (userId) {
      // Insert for logged-in user
      insertQuery = 'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)';
      insertParams = [userId, postId];
      console.log(`[LIKE API] Adding like for logged-in user ${userId} to post ${postId}`);
    } else {
      // Insert for anonymous user
      insertQuery = 'INSERT INTO post_likes (anonymous_id, post_id) VALUES (?, ?)';
      insertParams = [anonymousId, postId];
      console.log(`[LIKE API] Adding like for anonymous user ${anonymousId} to post ${postId}`);
    }

    db.run(insertQuery, insertParams, function (err) {
      if (err) {
        console.error('[LIKE API] Error liking post:', err.message);
        return res.status(500).json({ message: 'Error liking post', error: err.message });
      }

      // Get the updated like count
      db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, result) => {
        if (err) {
          console.error('[LIKE API] Error getting updated like count:', err.message);
          return res.status(500).json({ message: 'Error getting like count' });
        }
        const likes = result.likes || 0;
        console.log(`[LIKE API] Updated like count for post ${postId}: ${likes}`);

        // Update post_stats table
        db.run(
          'INSERT OR REPLACE INTO post_stats (post_id, likes, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [postId, likes],
          (err) => {
            if (err) {
              console.error('[LIKE API] Error updating post stats:', err);
              // Continue anyway, don't fail the request
            }
          }
        );

        res.status(200).json({
          message: 'Post liked successfully',
          likes: likes,
          isLiked: true
        });
      });
    });
  });
});

// Get Post Statistics API with like status for current user (supports anonymous users)
app.get('/api/posts/:postId/stats', (req, res) => {
  const { postId } = req.params;
  const token = req.headers['authorization']?.split(' ')[1];
  let userId = null;
  const anonymousId = req.query.anonymous_id;

  // Try to decode token if present
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.id;
    } catch (err) {
      // Invalid token, continue with anonymous like check if anonymousId is provided
      console.error('Invalid token:', err.message);
    }
  }

  // Get like count and check if user liked the post
  db.serialize(() => {
    let likes = 0;
    let isLiked = false;
    let comments = 0;
    let views = 0;

    // Step 1: Get like count
    db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, likeResult) => {
      if (err) {
        return res.status(500).json({ message: 'Error getting like count' });
      }
      likes = likeResult.likes || 0;

      // Step 2: Check if user liked this post
      const checkLike = () => {
        let checkQuery;
        let checkParams;

        if (userId) {
          // Check for logged-in user
          checkQuery = 'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?';
          checkParams = [userId, postId];
        } else if (anonymousId) {
          // Check for anonymous user
          checkQuery = 'SELECT id FROM post_likes WHERE anonymous_id = ? AND post_id = ?';
          checkParams = [anonymousId, postId];
        } else {
          // No user info, skip like check
          isLiked = false;
          getComments();
          return;
        }

        db.get(checkQuery, checkParams, (err, like) => {
          if (err) {
            console.error('Error checking like status:', err.message);
            isLiked = false;
          } else {
            isLiked = !!like;
          }
          getComments();
        });
      };

      // Step 3: Get comment count
      const getComments = () => {
        db.get('SELECT COUNT(*) as comments FROM comments WHERE post_id = ?', [postId], (err, commentResult) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting comment count' });
          }
          comments = commentResult.comments || 0;
          getViews();
        });
      };

      // Step 4: Get view count
      const getViews = () => {
        db.get('SELECT views FROM post_stats WHERE post_id = ?', [postId], (err, viewResult) => {
          if (err) {
            return res.status(500).json({ message: 'Error getting view count' });
          }
          views = viewResult?.views || 0;
          returnResult();
        });
      };

      // Step 5: Return final result
      const returnResult = () => {
        const stats = {
          likes: likes,
          comments: comments,
          views: views,
          isLiked: isLiked
        };
        res.status(200).json(stats);
      };

      // Start the process
      checkLike();
    });
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
      // Get like count
      db.get('SELECT COUNT(*) as likes FROM post_likes WHERE post_id = ?', [postId], (err, likeResult) => {
        if (err) {
          console.error('Error getting likes for postId', postId, ':', err);
          reject(err);
          return;
        }

        // Get comment count
        db.get('SELECT COUNT(*) as comments FROM comments WHERE post_id = ?', [postId], (err, commentResult) => {
          if (err) {
            console.error('Error getting comments for postId', postId, ':', err);
            reject(err);
            return;
          }

          // Get view count
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
