// 基础配置
// 全局声明API_BASE_URL，供所有文件使用
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = 'http://localhost:5000/api';
}

// 获取JWT令牌
function getToken() {
  return localStorage.getItem('blog-jwt');
}

// 设置JWT令牌
function setToken(token) {
  localStorage.setItem('blog-jwt', token);
}

// 移除JWT令牌
function removeToken() {
  localStorage.removeItem('blog-jwt');
}

// 处理登录按钮点击
function handleLoginClick() {
  console.log('登录按钮被点击');
  createAuthModal('login');
}

// 处理注册按钮点击
function handleRegisterClick() {
  console.log('注册按钮被点击');
  createAuthModal('register');
}

// 处理GitHub登录
function handleGithubLogin() {
  console.log('GitHub登录按钮被点击');
  window.location.href = `${window.API_BASE_URL}/auth/github`;
}

// 处理Gitee登录
function handleGiteeLogin() {
  console.log('Gitee登录按钮被点击');
  window.location.href = `${window.API_BASE_URL}/auth/gitee`;
}

// 创建登录/注册模态框
function createAuthModal(type = 'login') {
  // 检查模态框是否已存在
  let modal = document.getElementById('auth-modal');
  if (modal) {
    // 更新模态框标题
    const title = modal.querySelector('#auth-modal-title');
    if (title) {
      title.textContent = type === 'login' ? '登录' : '注册';
    }
    
    // 显示对应的表单
    const loginForm = modal.querySelector('#login-form');
    const registerForm = modal.querySelector('#register-form');
    if (loginForm && registerForm) {
      if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    }
    
    // 显示模态框
    modal.classList.add('show');
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) {
      overlay.classList.add('show');
    }
    document.body.style.overflow = 'hidden';
    return;
  }
  
  // 创建模态框HTML
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
            <!-- 登录表单 -->
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
            
            <!-- 注册表单 -->
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
  
  // 添加模态框到页面
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // 初始化模态框事件
  initModalEvents();
}

// 初始化模态框事件
function initModalEvents() {
  // 关闭按钮事件
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
  
  // 切换登录/注册表单
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
  
  // 登录表单提交
  const loginSubmit = document.querySelector('.login-submit');
  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      
      if (username && password) {
        try {
          const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });

          const result = await response.json();

          if (response.ok) {
            setToken(result.token);
            hideAuthModal();
            updateLoginStatus();
          } else {
            alert(result.message || '登录失败，请检查用户名和密码！');
          }
        } catch (error) {
          console.error('登录错误:', error);
          alert('登录失败，请检查网络连接！');
        }
      } else {
        alert('请输入用户名和密码！');
      }
    });
  }
  
  // 注册表单提交
  const registerSubmit = document.querySelector('.register-submit');
  if (registerSubmit) {
    registerSubmit.addEventListener('click', async () => {
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      
      if (username && email && password) {
        try {
          const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
          });

          const result = await response.json();

          if (response.ok) {
        setToken(result.token);
        hideAuthModal();
        updateLoginStatus();
      } else {
            alert(result.message || '注册失败，请检查输入信息！');
          }
        } catch (error) {
          console.error('注册错误:', error);
          alert('注册失败，请检查网络连接！');
        }
      } else {
        alert('请填写所有必填字段！');
      }
    });
  }
  
  // 按Escape键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAuthModal();
    }
  });
}

// 隐藏模态框
function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  const overlay = document.getElementById('auth-modal-overlay');
  
  if (modal && overlay) {
    modal.classList.remove('show');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// 更新登录状态
async function updateLoginStatus() {
  const cardAuth = document.querySelector('.card-auth');
  if (!cardAuth) return;
  
  const token = getToken();
  let userInfo = null;
  
  if (token) {
      try {
        const response = await fetch(`${window.API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      
      if (response.ok) {
        userInfo = await response.json();
      }
    } catch (error) {
      console.error('获取用户信息错误:', error);
    }
  }
  
  if (userInfo) {
    // 用户已登录，显示用户信息
    const authButtons = cardAuth.querySelectorAll('.auth-buttons');
    authButtons.forEach(btn => btn.style.display = 'none');
    
    // 隐藏默认的auth-header部分（包含第二个头像）
    const authHeader = cardAuth.querySelector('.auth-header');
    if (authHeader) {
      authHeader.style.display = 'none';
    }
    
    // 检查是否已存在用户信息元素
    let userInfoElement = cardAuth.querySelector('.user-info');
    if (!userInfoElement) {
      const userInfoHtml = `
        <div class="user-info">
          <div class="user-avatar">
            <img src="/images/OIP-C.webp" alt="${userInfo.username}">
          </div>
          <div class="user-details">
            <h4 class="user-name">${userInfo.username}</h4>
            ${userInfo.email ? `<p class="user-email">${userInfo.email}</p>` : ''}
          </div>
          <button class="auth-btn logout-btn">
            <i class="fas fa-sign-out-alt"></i> 登出
          </button>
        </div>
      `;
      cardAuth.insertAdjacentHTML('beforeend', userInfoHtml);
      
      // 添加登出事件
      const logoutBtn = cardAuth.querySelector('.logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch(`${window.API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.error('登出错误:', error);
          }
          
          removeToken();
          updateLoginStatus();
          alert('登出成功！');
        });
      }
    }
  } else {
    // 用户未登录，显示登录按钮
    const userInfoElements = cardAuth.querySelectorAll('.user-info');
    userInfoElements.forEach(el => el.style.display = 'none');
    
    // 显示默认的auth-header部分
    const authHeader = cardAuth.querySelector('.auth-header');
    if (authHeader) {
      authHeader.style.display = 'block';
    }
    
    const authButtons = cardAuth.querySelectorAll('.auth-buttons');
    authButtons.forEach(btn => btn.style.display = 'flex');
  }
}

// 绑定登录按钮事件监听器
function bindLoginButtonListeners() {
  console.log('绑定登录按钮事件监听器...');
  
  // 获取所有登录相关按钮
  const loginBtns = document.querySelectorAll('.login-btn, .auth-btn.login-btn');
  const registerBtns = document.querySelectorAll('.register-btn, .auth-btn.register-btn');
  const githubBtns = document.querySelectorAll('.github-btn, .auth-btn.github-btn');
  const giteeBtns = document.querySelectorAll('.gitee-btn, .auth-btn.gitee-btn');
  
  // 绑定登录按钮事件
  loginBtns.forEach(btn => {
    btn.removeEventListener('click', handleLoginClick);
    btn.addEventListener('click', handleLoginClick);
  });
  
  // 绑定注册按钮事件
  registerBtns.forEach(btn => {
    btn.removeEventListener('click', handleRegisterClick);
    btn.addEventListener('click', handleRegisterClick);
  });
  
  // 绑定GitHub登录按钮事件
  githubBtns.forEach(btn => {
    btn.removeEventListener('click', handleGithubLogin);
    btn.addEventListener('click', handleGithubLogin);
  });
  
  // 绑定Gitee登录按钮事件
  giteeBtns.forEach(btn => {
    btn.removeEventListener('click', handleGiteeLogin);
    btn.addEventListener('click', handleGiteeLogin);
  });
  
  console.log('登录按钮事件监听器绑定完成！');
}

// 处理OAuth回调，保存token
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    console.log('从URL获取到token:', token);
    setToken(token);
    
    // 可选：重定向到首页，清除URL中的token
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // 更新登录状态
    updateLoginStatus();
    
    
  }
}

// DOM就绪时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    handleOAuthCallback();
    bindLoginButtonListeners();
    updateLoginStatus();
  });
} else {
  handleOAuthCallback();
  bindLoginButtonListeners();
  updateLoginStatus();
}

// 支持PJAX
if (window.Pjax) {
  document.addEventListener('pjax:complete', () => {
    bindLoginButtonListeners();
    updateLoginStatus();
  });
}