const fetch = require('node-fetch').default;

// 测试API URL
const API_BASE_URL = 'http://localhost:3000/api';

// 测试登录获取令牌
async function testLogin() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username: 'testuser', 
        password: 'testpassword' 
      })
    });

    const data = await response.json();
    console.log('Login response:', data);
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// 测试创建评论
async function testCreateComment() {
  const token = await testLogin();
  if (!token) {
    console.log('Failed to get token, skipping comment test');
    return;
  }

  try {
    const postId = 'test-post';
    const content = 'Test comment from API test';
    
    const response = await fetch(`${API_BASE_URL}/comments/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    console.log('Create comment response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const rawResponse = await response.text();
    console.log('Raw response:', rawResponse);
    
    try {
      const jsonData = JSON.parse(rawResponse);
      console.log('Parsed JSON response:', jsonData);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
    }
  } catch (error) {
    console.error('Create comment error:', error);
  }
}

// 测试获取评论
async function testGetComments() {
  try {
    const postId = 'test-post';
    
    const response = await fetch(`${API_BASE_URL}/comments/${postId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Get comments response status:', response.status);
    const rawResponse = await response.text();
    console.log('Get comments raw response:', rawResponse);
    
    try {
      const jsonData = JSON.parse(rawResponse);
      console.log('Parsed comments:', jsonData);
    } catch (jsonError) {
      console.error('JSON parsing error for comments:', jsonError);
    }
  } catch (error) {
    console.error('Get comments error:', error);
  }
}

// 运行测试
async function runTests() {
  console.log('Running API tests...');
  await testGetComments();
  await testCreateComment();
  await testGetComments();
}

runTests();
