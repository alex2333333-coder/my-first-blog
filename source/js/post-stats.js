// Simple post statistics script with anonymous like support
// Configuration
// 直接使用全局API_BASE_URL

// Log function for debugging
function log(msg) {
  console.log(`[STATS] ${msg}`);
}

// Generate or get anonymous ID
function getAnonymousId() {
  let anonymousId = localStorage.getItem('anonymousId');
  if (!anonymousId) {
    // Generate a new anonymous ID using crypto API if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      anonymousId = crypto.randomUUID();
    } else {
      // Fallback to a simple random string
      anonymousId = 'anon-' + Math.random().toString(36).substr(2, 9) + Date.now();
    }
    localStorage.setItem('anonymousId', anonymousId);
    log(`Generated new anonymous ID: ${anonymousId}`);
  }
  return anonymousId;
}

// Helper function to extract post ID from URL or element
function getPostId() {
  // First check if there's a like button with data-post-id attribute
  const likeButton = document.querySelector('.post-like-btn, .like-btn');
  if (likeButton && likeButton.dataset.postId) {
    return likeButton.dataset.postId;
  }
  
  // If no like button or no data-post-id, get from URL path
  const path = window.location.pathname;
  const postId = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'default-post';
  return postId;
}

// Fetch stats from API with anonymous ID support
async function fetchPostStats(postId) {
  try {
    const anonymousId = getAnonymousId();
    const response = await fetch(`${window.API_BASE_URL}/posts/${encodeURIComponent(postId)}/stats?anonymous_id=${encodeURIComponent(anonymousId)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    log('Error fetching stats:', error);
    return { likes: 0, comments: 0, views: 0, isLiked: false };
  }
}

// Like post function with anonymous support
async function likePost(postId) {
  try {
    const anonymousId = getAnonymousId();
    const response = await fetch(`${window.API_BASE_URL}/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ anonymous_id: anonymousId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log('Error liking post:', error);
    return { success: false, message: error.message };
  }
}

// Like comment function with anonymous support
async function likeComment(commentId) {
  try {
    const anonymousId = getAnonymousId();
    const response = await fetch(`${window.API_BASE_URL}/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ anonymous_id: anonymousId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log('Error liking comment:', error);
    return { success: false, message: error.message };
  }
}

// Update stats for single post
async function updatePostStats(postElement, postId) {
  log(`Updating stats for post: ${postId}`);
  
  const stats = await fetchPostStats(postId);
  log(`Fetched stats:`, stats);
  
  // Get stats container
  const statsContainer = postElement.querySelector('.post-card-stats');
  if (!statsContainer) {
    log('Stats container not found');
    return;
  }
  
  // Update view count
  const viewElement = statsContainer.querySelector('.post-card-view-count');
  if (viewElement) {
    viewElement.innerHTML = `<i class="fas fa-eye"></i><span>${stats.views || 0}</span>`;
  }
  
  // Update comment count
  const commentElement = statsContainer.querySelector('.post-card-comment-count');
  if (commentElement) {
    commentElement.innerHTML = `<i class="fas fa-comment"></i><span>${stats.comments || 0}</span>`;
  }
  
  // Update like count
  const likeElement = statsContainer.querySelector('.post-card-like-count');
  if (likeElement) {
    likeElement.innerHTML = `<i class="fas fa-heart"></i><span>${stats.likes || 0}</span>`;
  }
}

// Update stats on post page
async function updateSinglePostPage() {
  // Get post ID from current path
  const postId = getPostId();
  
  // Fetch stats from API
  const stats = await fetchPostStats(postId);
  
  // Ensure likes is at least 0
  const likeCount = stats.likes || 0;
  
  // Update all like buttons on the page
  const likeButtons = document.querySelectorAll('.post-like-btn, .like-btn');
  console.log(`Found ${likeButtons.length} like buttons`);
  likeButtons.forEach(button => {
    console.log(`Updating button with post ID: ${postId}`);
    console.log(`Stats for this post:`, stats);
    
    // Update button HTML with like count
    if (stats.isLiked) {
      button.disabled = true;
      button.classList.add('liked');
      button.innerHTML = `<i class="fas fa-heart"></i> 已点赞 <span class="like-count">${likeCount}</span>`;
    } else {
      button.disabled = false;
      button.classList.remove('liked');
      button.innerHTML = `<i class="fas fa-heart"></i> 点赞 <span class="like-count">${likeCount}</span>`;
    }
    
    // Log final button HTML
    console.log(`Button HTML after update: ${button.innerHTML}`);
    console.log(`Button isLiked: ${stats.isLiked}, classList: ${button.classList}`);
  });
  
  // Update view count if element exists
  const viewCountEl = document.querySelector('.post-view-number');
  if (viewCountEl) {
    viewCountEl.textContent = stats.views || 0;
  }
  
  // Update comment count if element exists
  const commentCountEl = document.querySelector('.post-comment-number');
  if (commentCountEl) {
    commentCountEl.textContent = stats.comments || 0;
  }
}

// Update stats on homepage
async function updateHomePage() {
  console.log('Updating homepage stats');
  
  // Get all post items
  const postItems = document.querySelectorAll('.recent-post-item');
  console.log(`Found ${postItems.length} post items`);
  
  // Process each post item
  for (const postItem of postItems) {
    // Get post link
    const postLink = postItem.querySelector('.article-title a');
    if (!postLink) continue;
    
    try {
      // Extract post ID from URL path
      const postUrl = new URL(postLink.href);
      const path = postUrl.pathname;
      const postId = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'default-post';
      
      // Update stats for this post
      console.log(`Updating stats for post: ${postId}`);
      await updatePostStats(postItem, postId);
    } catch (error) {
      console.log('Error processing post:', error);
    }
  }
}

// Update stats for post cards on homepage
async function updatePostStats(postElement, postId) {
  console.log(`Updating stats for post: ${postId}`);
  
  const stats = await fetchPostStats(postId);
  console.log(`Fetched stats:`, stats);
  
  // Get stats container
  const statsContainer = postElement.querySelector('.post-card-stats');
  if (!statsContainer) {
    console.log('Stats container not found');
    return;
  }
  
  // Update like count
  const likeElement = statsContainer.querySelector('.post-card-like-count');
  if (likeElement) {
    likeElement.innerHTML = `<i class="fas fa-heart"></i><span>${stats.likes || 0}</span>`;
    if (stats.isLiked) {
      likeElement.classList.add('liked');
    } else {
      likeElement.classList.remove('liked');
    }
  }
}

// Add like button event listeners
function addLikeButtonListeners() {
  console.log('Adding like button listeners');
  
  // Add listeners for post like buttons
  const postLikeButtons = document.querySelectorAll('.post-like-btn, .like-btn');
  console.log(`Found ${postLikeButtons.length} post like buttons`);
  
  postLikeButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Post like button clicked');
      
      // Get post ID
      let postId;
      
      if (document.querySelector('#post')) {
        // Single post page
        // Get post ID from URL path directly
        const path = window.location.pathname;
        postId = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'default-post';
      } else {
        // List page, get post ID from data attribute or parent
        postId = button.dataset.postId;
        if (!postId) {
          // Try to get from parent
          const postElement = button.closest('.recent-post-item');
          if (postElement) {
            const postLink = postElement.querySelector('.article-title a');
            if (postLink) {
              const postUrl = new URL(postLink.href);
              const path = postUrl.pathname;
              postId = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'default-post';
            }
          }
        }
      }
      
      if (!postId) {
        console.log('Could not determine post ID');
        return;
      }
      
      // Like the post
      console.log(`Liking post with ID: ${postId}`);
      const result = await likePost(postId);
      
      if (result.likes !== undefined) {
        console.log('Post liked successfully, new like count:', result.likes);
        
        // Update like count in UI
        if (document.querySelector('#post')) {
          // Single post page - update all like buttons
          const likeButtons = document.querySelectorAll('.post-like-btn, .like-btn');
          likeButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('liked');
            btn.innerHTML = `<i class="fas fa-heart"></i> 已点赞 <span class="like-count">${result.likes}</span>`;
          });
        } else {
          // List page
          const postElement = button.closest('.recent-post-item');
          if (postElement) {
            const likeElement = postElement.querySelector('.post-card-like-count span');
            if (likeElement) {
              likeElement.textContent = result.likes;
            }
          }
          
          // Update button state
          button.disabled = true;
          button.classList.add('liked');
          button.innerHTML = `<i class="fas fa-heart"></i> 已点赞 <span class="like-count">${result.likes}</span>`;
        }
      } else {
        console.log('Failed to like post:', result.message);
        alert(result.message || '点赞失败，请稍后再试');
      }
    });
  });
  
  // Add listeners for comment like buttons (if any)
  const commentLikeButtons = document.querySelectorAll('.comment-like-btn');
  console.log(`Found ${commentLikeButtons.length} comment like buttons`);
  
  commentLikeButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Comment like button clicked');
      
      // Get comment ID from data attribute
      const commentId = button.dataset.commentId;
      if (!commentId) {
        console.log('Could not determine comment ID');
        return;
      }
      
      // Like the comment
      console.log(`Liking comment with ID: ${commentId}`);
      const result = await likeComment(commentId);
      
      if (result.likes !== undefined) {
        console.log('Comment liked successfully, new like count:', result.likes);
        
        // Update like count in UI
        const likeCount = button.querySelector('.comment-like-count');
        if (likeCount) {
          likeCount.textContent = result.likes;
        }
        
        // Update button state
        button.disabled = true;
        button.classList.add('liked');
        button.innerHTML = '<i class="fas fa-heart"></i>';
      } else {
        console.log('Failed to like comment:', result.message);
        alert(result.message || '点赞失败，请稍后再试');
      }
    });
  });
}

// Initialize stats and like buttons
async function initStats() {
  log('Initializing post stats');
  
  // Check if we're on a post page or homepage
  if (document.querySelector('#post')) {
    // Single post page
    await updateSinglePostPage();
  } else {
    // Homepage or list page
    await updateHomePage();
  }
  
  // Add like button listeners
  addLikeButtonListeners();
}

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initStats);

// Run again after a short delay to ensure all elements are loaded
setTimeout(initStats, 500);