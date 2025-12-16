// Custom comments component for Hexo Butterfly theme
// Using backend API for real comment functionality

// Backend API base URL for comments - use the same global base URL as other components
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = 'http://localhost:5000/api';
}
const COMMENT_API_BASE_URL = window.API_BASE_URL;
console.log('COMMENT_API_BASE_URL is set to:', COMMENT_API_BASE_URL);

// Get JWT token from localStorage
function getToken() {
  return localStorage.getItem('blog-jwt');
}

// Get comments for a specific post
async function getComments(postId) {
  try {
    const fullUrl = COMMENT_API_BASE_URL + '/comments/' + postId;
    console.log('GET Comments - URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Ensure no redirects
      redirect: 'error'
    });

    console.log('GET Comments - Response status:', response.status);
    const rawResponse = await response.text();
    console.log('GET Comments - Raw response:', rawResponse);
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(rawResponse);
        console.log('GET Comments - Parsed JSON:', jsonData);
        return jsonData;
      } catch (jsonError) {
        console.error('GET Comments - JSON parsing error:', jsonError);
        return [];
      }
    } else {
      try {
        const error = JSON.parse(rawResponse);
        console.error('GET Comments - Error response:', error);
      } catch (jsonError) {
        console.error('GET Comments - Error parsing error response:', jsonError);
      }
      return [];
    }
  } catch (error) {
    console.error('GET Comments - Fetch error:', error);
    return [];
  }
}

// Create a new comment
async function createComment(postId, content) {
  const token = getToken();
  if (!token) {
    throw new Error('Please login first');
  }

  try {
    const fullUrl = COMMENT_API_BASE_URL + '/comments/' + postId;
    console.log('POST Comment - URL:', fullUrl);
    console.log('POST Comment - Content:', content);
    console.log('POST Comment - Token:', token);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content }),
      // Ensure no redirects
      redirect: 'error'
    });

    console.log('POST Comment - Response status:', response.status);
    console.log('POST Comment - Response headers:', response.headers);
    
    // Get raw response text to see what's actually being returned
    const rawResponse = await response.text();
    console.log('POST Comment - Raw response:', rawResponse);
    
    if (response.ok) {
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(rawResponse);
        console.log('POST Comment - Parsed JSON:', jsonData);
        return jsonData;
      } catch (jsonError) {
        console.error('POST Comment - JSON parsing error:', jsonError);
        throw new Error('Invalid JSON response from server: ' + jsonError.message);
      }
    } else {
      // Try to parse error as JSON
      try {
        const error = JSON.parse(rawResponse);
        console.log('POST Comment - Error JSON:', error);
        throw new Error(error.message || 'Error creating comment');
      } catch (jsonError) {
        console.error('POST Comment - Error parsing error response:', jsonError);
        throw new Error('Server error: ' + rawResponse.substring(0, 100));
      }
    }
  } catch (error) {
    console.error('POST Comment - Fetch error:', error);
    throw error;
  }
}

// Format date to human-readable format
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Like a comment
async function likeComment(commentId) {
  const token = getToken();
  if (!token) {
    alert('请先登录后再点赞！');
    return;
  }

  try {
    const fullUrl = COMMENT_API_BASE_URL + '/comments/' + commentId + '/like';
    console.log('Like Comment - URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      // Ensure no redirects
      redirect: 'error'
    });

    console.log('Like Comment - Response status:', response.status);
    const rawResponse = await response.text();
    console.log('Like Comment - Raw response:', rawResponse);
    
    if (response.ok) {
      try {
        return JSON.parse(rawResponse);
      } catch (jsonError) {
        console.error('Like Comment - JSON parsing error:', jsonError);
        return null;
      }
    } else {
      try {
        const error = JSON.parse(rawResponse);
        throw new Error(error.message || '点赞失败');
      } catch (jsonError) {
        console.error('Like Comment - Error parsing error response:', jsonError);
        throw new Error('点赞失败，请重试！');
      }
    }
  } catch (error) {
    console.error('Like Comment - Fetch error:', error);
    alert(error.message || '点赞失败，请重试！');
  }
}

// Render comments list
function renderComments(container, postId, comments) {
  if (comments.length === 0) {
    container.innerHTML = '<div class="no-comments">暂无评论，快来发表第一条评论吧！</div>';
    return;
  }

  const commentsHTML = comments.map(comment => `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-avatar">
        <img src="/images/OIP-C.webp" alt="${comment.username}">
      </div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-username">${comment.username}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-body">
          ${comment.content}
        </div>
        <div class="comment-actions">
          <button class="like-btn" data-comment-id="${comment.id}">
            <i class="fas fa-heart"></i>
            <span class="like-count">${comment.likes || 0}</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = commentsHTML;

  // Add event listeners for like buttons
  const likeBtns = container.querySelectorAll('.like-btn');
  likeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const result = await likeComment(commentId);
      if (result) {
        // Update like count
        const likeCount = btn.querySelector('.like-count');
        likeCount.textContent = result.likes || 0;
        // Add animation effect
        btn.querySelector('i').classList.add('liked');
        setTimeout(() => {
          btn.querySelector('i').classList.remove('liked');
        }, 1000);
      }
    });
  });
}

// Render comment form
function renderCommentForm(container, postId, onCommentCreated) {
  const token = getToken();
  const isLoggedIn = !!token;

  container.innerHTML = `
    <div class="comment-form-container">
      <h3 class="comment-form-title">发表评论</h3>
      ${!isLoggedIn ? 
        '<div class="login-prompt">请先登录后再发表评论</div>' : 
        `
          <form class="comment-form">
            <div class="form-group">
              <textarea 
                class="comment-textarea" 
                placeholder="写下你的评论..." 
                required
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="comment-submit-btn">发表评论</button>
            </div>
          </form>
        `
      }
    </div>
  `;

  if (isLoggedIn) {
    const form = container.querySelector('.comment-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const textarea = form.querySelector('.comment-textarea');
      const content = textarea.value.trim();

      if (content) {
        try {
          const result = await createComment(postId, content);
          textarea.value = '';
          onCommentCreated(result.comment);
        } catch (error) {
          alert(error.message || '发表评论失败，请重试！');
        }
      }
    });
  }
}

// Initialize comments component
async function initComments() {
  const commentsContainer = document.getElementById('custom-comment-component');
  if (!commentsContainer) {
    return;
  }

  // Get post ID from data attribute
  let postId = commentsContainer.dataset.postId || window.location.pathname;
  console.log('Raw Post ID:', postId);
  
  // Ensure postId is a valid string and not empty
  if (!postId || typeof postId !== 'string') {
    postId = 'default-post';
    console.log('Using default postId:', postId);
  } else {
    // Sanitize postId to prevent URL issues
    // Remove leading/trailing slashes and replace slashes with hyphens
    postId = postId.trim().replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    // Ensure postId is not empty after sanitization
    postId = postId || 'default-post';
    console.log('Sanitized Post ID:', postId);
  }
  
  // Create comments wrapper
  const commentsWrapper = document.createElement('div');
  commentsWrapper.className = 'comments-wrapper';
  
  // Create comments list container
  const commentsList = document.createElement('div');
  commentsList.className = 'comments-list';
  commentsWrapper.appendChild(commentsList);
  
  // Create comment form container
  const commentForm = document.createElement('div');
  commentForm.className = 'comment-form-wrapper';
  commentsWrapper.appendChild(commentForm);
  
  // Append to comments container
  commentsContainer.appendChild(commentsWrapper);
  
  // Load comments
  let comments = await getComments(postId);
  renderComments(commentsList, postId, comments);
  
  // Render comment form
  renderCommentForm(commentForm, postId, (newComment) => {
    // Add new comment to the beginning of the list
    comments.unshift(newComment);
    renderComments(commentsList, postId, comments);
  });
  
  // Listen for auth state changes
  document.addEventListener('authStateChange', () => {
    // Re-render comment form when auth state changes
    renderCommentForm(commentForm, postId, (newComment) => {
      // Add new comment to the beginning of the list
      comments.unshift(newComment);
      renderComments(commentsList, postId, comments);
    });
  });
}

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', initComments);
