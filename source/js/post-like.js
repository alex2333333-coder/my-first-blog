// Post like functionality with anonymous support
// Simplified version for better reliability

// Configuration
// 直接使用全局API_BASE_URL

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
    console.log(`[LIKE] Generated new anonymous ID: ${anonymousId}`);
  }
  return anonymousId;
}

// Get JWT token from localStorage
function getToken() {
  return localStorage.getItem('blog-jwt');
}

// Initialize like button - set initial like count and status
async function initializeLikeButton(button) {
  const postId = button.dataset.postId;
  if (!postId) {
    console.error('[LIKE] Button missing data-post-id attribute');
    return;
  }

  try {
    const anonymousId = getAnonymousId();
    const token = getToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Fetch current like stats
    const url = `${window.API_BASE_URL}/posts/${encodeURIComponent(postId)}/stats?anonymous_id=${encodeURIComponent(anonymousId)}`;
    console.log(`[LIKE] Fetching stats from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    console.log(`[LIKE] Stats response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stats = await response.json();
    console.log(`[LIKE] Stats response:`, stats);
    updateLikeButton(button, stats.likes || 0, stats.isLiked || false);
    
  } catch (error) {
    console.error('[LIKE] Error initializing like button:', error);
    // Set default state if initialization fails
    updateLikeButton(button, 0, false);
  }
}

// Update like button UI
function updateLikeButton(button, likes, isLiked) {
  // Update button text and state
  button.innerHTML = `<i class="fas fa-heart"></i> ${isLiked ? '已点赞' : '点赞'} <span class="like-count">${likes}</span>`;
  
  if (isLiked) {
    button.disabled = true;
    button.classList.add('liked');
  } else {
    button.disabled = false;
    button.classList.remove('liked');
  }
}

// Handle like button click
async function handleLikeButtonClick(event) {
  event.preventDefault();
  console.log('[LIKE] Button clicked!', event.target);
  
  const button = event.target.closest('.post-like-btn, .like-btn');
  if (!button) {
    console.error('[LIKE] Could not find button element');
    return;
  }
  
  const postId = button.dataset.postId;
  if (!postId) {
    console.error('[LIKE] Button missing data-post-id attribute');
    return;
  }
  console.log('[LIKE] Post ID:', postId);
  
  // Disable button to prevent multiple clicks
  button.disabled = true;
  
  try {
    const anonymousId = getAnonymousId();
    const token = getToken();
    console.log('[LIKE] Anonymous ID:', anonymousId);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Send like request
    const url = `${window.API_BASE_URL}/posts/${encodeURIComponent(postId)}/like`;
    const body = JSON.stringify({ anonymous_id: anonymousId });
    console.log(`[LIKE] Sending like request to: ${url}`);
    console.log(`[LIKE] Request body: ${body}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    console.log(`[LIKE] Like response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[LIKE] Like response:', result);
    
    // Update button with new like count and status
    updateLikeButton(button, result.likes, true);
    
    console.log('[LIKE] Post liked successfully:', result);
    
  } catch (error) {
    console.error('[LIKE] Error liking post:', error);
    // Re-enable button on error
    button.disabled = false;
    alert('点赞失败，请稍后再试');
  }
}

// Initialize all like buttons on the page
function initLikeButtons() {
  console.log('[LIKE] Initializing like buttons...');
  
  // Get all like buttons
  const likeButtons = document.querySelectorAll('.post-like-btn, .like-btn');
  console.log(`[LIKE] Found ${likeButtons.length} like buttons`);
  
  // Add event listeners and initialize each button
  likeButtons.forEach(button => {
    // Remove any existing listeners to prevent duplicates
    button.removeEventListener('click', handleLikeButtonClick);
    // Add new click listener
    button.addEventListener('click', handleLikeButtonClick);
    // Initialize button with current like count
    initializeLikeButton(button);
    
    // Make button focusable for accessibility
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'button');
  });
  
  console.log('[LIKE] Like buttons initialized');
}

// Initialize like buttons when DOM is loaded
// Directly call initLikeButtons since script is loaded at bottom of page
initLikeButtons();

// Also listen for DOMContentLoaded to handle cases where script might be loaded earlier
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLikeButtons);
} else {
  // DOM is already loaded, initialize immediately
  initLikeButtons();
}

// Handle PJAX for Butterfly theme
// When page content is loaded via PJAX, re-initialize like buttons
if (window.Pjax) {
  document.addEventListener('pjax:complete', initLikeButtons);
}

// For debugging - expose functions to global scope
window.likeDebug = {
  init: initLikeButtons,
  getAnonymousId: getAnonymousId,
  getToken: getToken
};
