// Complete test script to test post like functionality
const http = require('http');
const https = require('https');

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test function
async function runTest() {
  console.log('=== Testing Blog Post Like Functionality ===\n');
  
  try {
    // Step 1: Get homepage to find a blog post
    console.log('1. Getting blog homepage...');
    const homepageOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const homepageResponse = await makeRequest(homepageOptions);
    console.log(`   Status: ${homepageResponse.status}`);
    
    // Step 2: Extract a blog post URL from homepage
    console.log('\n2. Extracting blog post URL from homepage...');
    const postLinkRegex = /<a[^>]+class="article-title"[^>]+href="([^"]+)"[^>]*>/;
    const match = homepageResponse.data.match(postLinkRegex);
    
    if (!match) {
      console.log('   ❌ Failed to find article-title links on homepage');
      console.log('   ℹ️  This might be due to theme differences or no posts available');
      console.log('   ⚠️  Using a sample post ID instead...');
      testLikeWithSamplePost();
      return;
    }
    
    const postUrlPath = match[1];
    console.log(`   ✅ Found post URL path: ${postUrlPath}`);
    
    // Step 3: Extract post ID from URL path
    console.log('\n3. Extracting post ID from URL path...');
    const pathParts = postUrlPath.replace(/^\/+|\/+$/g, '').split('/');
    if (pathParts.length < 4) {
      console.log('   ❌ Invalid post URL format, expected at least 4 path parts');
      testLikeWithSamplePost();
      return;
    }
    
    const year = pathParts[0];
    const month = pathParts[1].padStart(2, '0');
    const day = pathParts[2].padStart(2, '0');
    const slug = pathParts.slice(3).join('-');
    const postId = `${year}-${month}-${day}-${slug}`;
    console.log(`   ✅ Extracted post ID: ${postId}`);
    
    // Step 4: Test like functionality
    await testLikeFunctionality(postId);
    
  } catch (error) {
    console.error('Error during test:', error);
    console.log('\n   ⚠️  Fallback to sample post ID...');
    testLikeWithSamplePost();
  }
}

// Test like functionality with a specific post ID
async function testLikeFunctionality(postId) {
  const anonymousId = 'test-anonymous-id-123';
  
  console.log(`\n4. Testing like functionality for post: ${postId}`);
  console.log(`   Using anonymous ID: ${anonymousId}`);
  
  // Step 4.1: Get initial stats
  console.log('\n   4.1 Getting initial like stats...');
  const statsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/posts/${postId}/stats?anonymous_id=${anonymousId}`,
    method: 'GET'
  };
  
  const initialStats = await makeRequest(statsOptions);
  console.log(`   Status: ${initialStats.status}`);
  let initialStatsData;
  try {
    initialStatsData = JSON.parse(initialStats.data);
    console.log(`   Initial likes: ${initialStatsData.likes}`);
  } catch (parseError) {
    console.log('   ❌ Failed to parse stats response:', parseError.message);
    console.log('   Response data:', initialStats.data);
    return;
  }
  
  // Step 4.2: Send like request
  console.log('\n   4.2 Sending like request...');
  const likeOptions = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/posts/${postId}/like`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ anonymous_id: anonymousId })
  };
  
  const likeResponse = await makeRequest(likeOptions);
  console.log(`   Status: ${likeResponse.status}`);
  let likeData;
  try {
    likeData = JSON.parse(likeResponse.data);
    console.log(`   Like response: ${JSON.stringify(likeData)}`);
  } catch (parseError) {
    console.log('   ❌ Failed to parse like response:', parseError.message);
    console.log('   Response data:', likeResponse.data);
    return;
  }
  
  // Step 4.3: Get updated stats
  console.log('\n   4.3 Getting updated like stats...');
  const updatedStats = await makeRequest(statsOptions);
  console.log(`   Status: ${updatedStats.status}`);
  let updatedStatsData;
  try {
    updatedStatsData = JSON.parse(updatedStats.data);
    console.log(`   Updated likes: ${updatedStatsData.likes}`);
  } catch (parseError) {
    console.log('   ❌ Failed to parse updated stats response:', parseError.message);
    console.log('   Response data:', updatedStats.data);
    return;
  }
  
  // Step 4.4: Verify results
  console.log('\n   4.4 Verifying results...');
  if (likeData.success === false) {
    console.log(`   ❌ Like request failed: ${likeData.message}`);
    return;
  }
  
  if (updatedStatsData.likes > initialStatsData.likes) {
    console.log(`   ✅ SUCCESS! Like count increased from ${initialStatsData.likes} to ${updatedStatsData.likes}`);
    console.log('   ✅ Post like functionality is working correctly!');
    console.log('\n   🎉 The backend API is responding correctly and updating like counts.');
    console.log('   🎉 Your blog post like functionality is ready to use!');
  } else if (updatedStatsData.likes === initialStatsData.likes) {
    if (likeData.message === 'Post already liked') {
      console.log(`   ℹ️  Post was already liked by this anonymous ID, like count remains at ${updatedStatsData.likes}`);
      console.log('   ✅ Like functionality is working correctly (preventing duplicate likes)');
    } else {
      console.log(`   ❌ Like count did not increase, still at ${updatedStatsData.likes}`);
      console.log('   Response messages:');
      console.log(`   - Initial stats: ${JSON.stringify(initialStatsData)}`);
      console.log(`   - Like response: ${JSON.stringify(likeData)}`);
      console.log(`   - Updated stats: ${JSON.stringify(updatedStatsData)}`);
    }
  } else {
    console.log(`   ❌ Unexpected result: Like count decreased from ${initialStatsData.likes} to ${updatedStatsData.likes}`);
  }
}

// Fallback to sample post ID if homepage parsing fails
function testLikeWithSamplePost() {
  // Use a sample post ID based on typical Hexo post URL format
  const samplePostId = '2025-12-01-sample-post';
  console.log(`   Using sample post ID: ${samplePostId}`);
  testLikeFunctionality(samplePostId);
}

// Run the test
runTest();