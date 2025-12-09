// Simple post statistics script
// Configuration
const API_BASE_URL = 'https://blog-backend.2136026360.workers.dev/api';

// Log function for debugging
function log(msg) {
  console.log(`[STATS] ${msg}`);
}

// Helper function to extract post ID from URL
function getPostIdFromPath(path) {
  return path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'default-post';
}

// Fetch stats from API
async function fetchPostStats(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(postId)}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    log('Error fetching stats:', error);
    return { likes: 0, comments: 0, views: 0 };
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
  log('Updating single post page stats');
  
  const postId = getPostIdFromPath(window.location.pathname);
  const stats = await fetchPostStats(postId);
  
  // Update like count
  const likeCount = document.querySelector('.like-count');
  if (likeCount) {
    likeCount.textContent = stats.likes || 0;
  }
  
  // Update view count
  const viewCount = document.querySelector('.post-view-number');
  if (viewCount) {
    viewCount.textContent = stats.views || 0;
  }
  
  // Update comment count
  const commentCount = document.querySelector('.post-comment-number');
  if (commentCount) {
    commentCount.textContent = stats.comments || 0;
  }
}

// Update stats on homepage
async function updateHomePage() {
  log('Updating homepage stats');
  
  // Get all post items
  const postItems = document.querySelectorAll('.recent-post-item');
  log(`Found ${postItems.length} post items`);
  
  // Process each post item
  for (const postItem of postItems) {
    // Get post link
    const postLink = postItem.querySelector('.article-title a');
    if (!postLink) continue;
    
    try {
      // Extract post ID from URL
      const postUrl = new URL(postLink.href);
      const postId = getPostIdFromPath(postUrl.pathname);
      
      // Update stats for this post
      await updatePostStats(postItem, postId);
    } catch (error) {
      log('Error processing post:', error);
    }
  }
}

// Initialize stats
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
}

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initStats);

// Run again after a short delay to ensure all elements are loaded
setTimeout(initStats, 500);