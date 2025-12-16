// Test script to verify post like functionality
const http = require('http');

// Use a specific post ID from your blog
const postId = '2025-12-16-hexo-butterfly-like-functionality'; // Replace with a real post ID from your blog
const anonymousId = 'test-anonymous-id';

// Test function
async function testLikeFunctionality() {
  console.log(`Testing like functionality for post: ${postId}`);
  
  // Helper function to make GET requests
  function getStats() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/posts/${postId}/stats?anonymous_id=${anonymousId}`,
        method: 'GET'
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
  }
  
  // Helper function to make POST requests
  function likePost() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/posts/${postId}/like`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(JSON.stringify({ anonymous_id: anonymousId }));
      req.end();
    });
  }
  
  try {
    // Step 1: Get initial stats
    console.log('\n1. Getting initial stats...');
    const initialStats = await getStats();
    console.log(`   Status: ${initialStats.status}`);
    console.log(`   Initial likes: ${initialStats.data.likes}`);
    
    // Step 2: Perform like action
    console.log('\n2. Performing like action...');
    const likeResult = await likePost();
    console.log(`   Status: ${likeResult.status}`);
    console.log(`   Like result: ${JSON.stringify(likeResult.data)}`);
    
    // Step 3: Get stats again to verify like count increased
    console.log('\n3. Getting stats after like...');
    const statsAfterLike = await getStats();
    console.log(`   Status: ${statsAfterLike.status}`);
    console.log(`   Likes after like: ${statsAfterLike.data.likes}`);
    
    // Step 4: Verify results
    console.log('\n4. Verifying results...');
    if (statsAfterLike.data.likes > initialStats.data.likes) {
      console.log(`   ✓ Success! Like count increased from ${initialStats.data.likes} to ${statsAfterLike.data.likes}`);
      console.log('   ✓ Backend like functionality is working correctly');
    } else {
      console.log(`   ✗ Failed! Like count did not increase (still ${statsAfterLike.data.likes})`);
      console.log('   ✓ Initial stats:', initialStats.data);
      console.log('   ✓ Like result:', likeResult.data);
      console.log('   ✓ Stats after like:', statsAfterLike.data);
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testLikeFunctionality();