// Login component for Hexo Butterfly theme
// Using backend API for real user authentication

// Backend API base URL
const API_BASE_URL = 'https://blog-backend.2136026360.workers.dev/api';

// Fix the broken script tag issue first
function fixBrokenScriptTag() {
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.src === '/' || script.src === 'http://localhost:4000/' || script.src === 'https://steadybin.xyz/' || script.src === window.location.origin + '/') {
      script.remove();
      console.log('Removed broken script tag!');
    }
  });
}

// Get JWT token from localStorage
function getToken() {
  return localStorage.getItem('blog-jwt');
}

// Set JWT token to localStorage
function setToken(token) {
  localStorage.setItem('blog-jwt', token);
}

// Remove JWT token from localStorage
function removeToken() {
  localStorage.removeItem('blog-jwt');
}

// Get current user info from backend
async function getCurrentUser() {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return {
        nick: user.username,
        mail: user.email,
        avatar: '/images/OIP-C.webp'
      };
    } else {
      // Token is invalid, remove it
      removeToken();
      return null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Create a simple login/register modal
function createAuthModal(type = 'login') {
  // Check if modal already exists
  let modal = document.getElementById('auth-modal');
  if (modal) {
    // If modal exists, update it
    const title = modal.querySelector('#auth-modal-title');
    const loginForm = modal.querySelector('#login-form');
    const registerForm = modal.querySelector('#register-form');
    
    if (title) {
      title.textContent = type === 'login' ? '登录' : '注册';
    }
    
    if (loginForm && registerForm) {
      if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    }
    
    // Show the modal
    modal.classList.add('show');
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      overlay.classList.add('show');
    }
    document.body.style.overflow = 'hidden';
    return;
  }
  
  // Create modal HTML
  const modalHTML = `
    <div class="auth-modal-overlay" id="auth-modal-overlay">
      <div class="auth-modal" id="auth-modal">
        <div class="auth-modal-header">
          <h3 id="auth-modal-title">${type === 'login' ? '登录' : '注册'}</h3>
          <button class="auth-modal-close" id="auth-modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="auth-modal-content">
          <div class="auth-modal-body">
            <!-- Login form -->
            <div class="auth-form-container" id="login-form" style="display: ${type === 'login' ? 'block' : 'none'}">
              <div class="form-group">
                <label for="login-username">用户名</label>
                <input type="text" id="login-username" placeholder="请输入用户名">
              </div>
              <div class="form-group">
                <label for="login-password">密码</label>
                <input type="password" id="login-password" placeholder="请输入密码">
              </div>
              <div class="form-actions">
                <button class="auth-btn login-submit">登录</button>
              </div>
              <div class="form-switch">
                <span>还没有账号？</span>
                <button class="switch-to-register">立即注册</button>
              </div>
            </div>
            
            <!-- Register form -->
            <div class="auth-form-container" id="register-form" style="display: ${type === 'register' ? 'block' : 'none'}">
              <div class="form-group">
                <label for="register-username">用户名</label>
                <input type="text" id="register-username" placeholder="请输入用户名">
              </div>
              <div class="form-group">
                <label for="register-email">邮箱</label>
                <input type="email" id="register-email" placeholder="请输入邮箱">
              </div>
              <div class="form-group">
                <label for="register-password">密码</label>
                <input type="password" id="register-password" placeholder="请输入密码">
              </div>
              <div class="form-actions">
                <button class="auth-btn register-submit">注册</button>
              </div>
              <div class="form-switch">
                <span>已有账号？</span>
                <button class="switch-to-login">立即登录</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add modal events
  initModalEvents();
}

// Initialize modal events
function initModalEvents() {
  // Close button event
  const closeBtn = document.getElementById('auth-modal-close');
  const overlay = document.getElementById('auth-modal-overlay');
  const modal = document.getElementById('auth-modal');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideAuthModal);
  }
  
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hideAuthModal();
      }
    });
  }
  
  // Switch between login and register forms
  const switchToRegister = document.querySelector('.switch-to-register');
  const switchToLogin = document.querySelector('.switch-to-login');
  
  if (switchToRegister) {
    switchToRegister.addEventListener('click', () => {
      createAuthModal('register');
    });
  }
  
  if (switchToLogin) {
    switchToLogin.addEventListener('click', () => {
      createAuthModal('login');
    });
  }
  
  // Form submit events
  const loginSubmit = document.querySelector('.login-submit');
  const registerSubmit = document.querySelector('.register-submit');
  
  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      
      if (username && password) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });

          const result = await response.json();

          if (response.ok) {
            // Login successful
            setToken(result.token);
            alert(`登录成功！欢迎回来，${result.user.username}！`);
            hideAuthModal();
            await updateLoginStatus();
            // Trigger custom event for comment component
            const authEvent = new CustomEvent('authStateChange', {
              detail: {
                user: result.user,
                token: result.token
              }
            });
            document.dispatchEvent(authEvent);
          } else {
            alert(result.message || '登录失败，请检查用户名和密码！');
          }
        } catch (error) {
          console.error('Login error:', error);
          alert('登录失败，请检查网络连接！');
        }
      } else {
        alert('请输入用户名和密码！');
      }
    });
  }
  
  if (registerSubmit) {
    registerSubmit.addEventListener('click', async () => {
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      
      if (username && email && password) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
          });

          const result = await response.json();

          if (response.ok) {
            // Register successful
            setToken(result.token);
            alert(`注册成功！欢迎您，${result.user.username}！`);
            hideAuthModal();
            await updateLoginStatus();
            // Trigger custom event for comment component
            const authEvent = new CustomEvent('authStateChange', {
              detail: {
                user: result.user,
                token: result.token
              }
            });
            document.dispatchEvent(authEvent);
          } else {
            alert(result.message || '注册失败，请检查输入信息！');
          }
        } catch (error) {
          console.error('Register error:', error);
          alert('注册失败，请检查网络连接！');
        }
      } else {
        alert('请填写所有必填字段！');
      }
    });
  }
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAuthModal();
    }
  });
}

// Hide the auth modal
function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  const overlay = document.getElementById('auth-modal-overlay');
  
  if (modal && overlay) {
    modal.classList.remove('show');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Update login status UI
async function updateLoginStatus() {
  const cardAuth = document.querySelector('.card-auth');
  if (!cardAuth) return;
  
  const authForm = cardAuth.querySelector('.auth-form');
  const userInfo = await getCurrentUser();
  
  if (userInfo) {
    // User is logged in, show user info
    authForm.innerHTML = `
      <div class="auth-user-info">
        <div class="auth-user-avatar">
          <img src="${userInfo.avatar || '/images/OIP-C.webp'}" alt="${userInfo.nick}">
        </div>
        <div class="auth-user-details">
          <h4 class="auth-user-name">${userInfo.nick}</h4>
          ${userInfo.mail ? `<p class="auth-user-email">${userInfo.mail}</p>` : ''}
        </div>
      </div>
      <div class="auth-user-actions">
        <button class="auth-btn logout-btn">
          <i class="fas fa-sign-out-alt"></i> 登出
        </button>
      </div>
    `;
    
    // Add logout event listener
    const logoutBtn = authForm.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            removeToken();
            await updateLoginStatus();
            // Trigger custom event for comment component
            const authEvent = new CustomEvent('authStateChange', {
              detail: {
                user: null,
                token: null
              }
            });
            document.dispatchEvent(authEvent);
            alert('登出成功！');
          } else {
            alert('登出失败，请重试！');
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Even if logout API fails, remove token locally
          removeToken();
          await updateLoginStatus();
          // Trigger custom event for comment component
          const authEvent = new CustomEvent('authStateChange', {
            detail: {
              user: null,
              token: null
            }
          });
          document.dispatchEvent(authEvent);
          alert('登出成功！');
        }
      });
    }
  } else {
    // User is not logged in, show login/register buttons
    authForm.innerHTML = `
      <div class="auth-header">
        <div class="auth-avatar">
          <img src="/images/OIP-C.webp" alt="头像">
        </div>
        <div class="auth-greeting">
          <p>HI! 请登录</p>
        </div>
      </div>
      <div class="auth-buttons">
        <button class="auth-btn login-btn">
          <i class="fas fa-sign-in-alt"></i> 登录
        </button>
        <button class="auth-btn register-btn">
          <i class="fas fa-user-plus"></i> 注册
        </button>
      </div>
    `;
    
    // Add login/register event listeners
    const loginBtn = authForm.querySelector('.login-btn');
    const registerBtn = authForm.querySelector('.register-btn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        createAuthModal('login');
      });
    }
    
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        createAuthModal('register');
      });
    }
  }
}

// Initialize the login component
async function initLoginComponent() {
  console.log('Initializing login component...');
  // Fix broken script tags first
  fixBrokenScriptTag();
  
  // Update initial login status
  await updateLoginStatus();
  
  // Add direct event listeners to existing buttons
  const loginBtn = document.querySelector('.login-btn');
  const registerBtn = document.querySelector('.register-btn');
  
  console.log('Login button:', loginBtn);
  console.log('Register button:', registerBtn);
  
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      console.log('Login button clicked');
      createAuthModal('login');
    });
  }
  
  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      console.log('Register button clicked');
      createAuthModal('register');
    });
  }
}

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', initLoginComponent);

// Execute again when window is loaded (just in case)
window.addEventListener('load', initLoginComponent);