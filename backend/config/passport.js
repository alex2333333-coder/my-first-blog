const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const githubConfig = require('./github');

module.exports = (passport) => {
  passport.use(new GitHubStrategy(githubConfig, async (accessToken, refreshToken, profile, done) => {
    try {
      // 查找或创建GitHub用户
      let user = await User.findOne({ githubId: profile.id });
      
      if (user) {
        // 更新GitHub用户信息
        user.githubName = profile.username;
        user.githubEmail = profile.emails[0].value;
        user.githubAvatar = profile.photos[0].value;
        user.githubAccessToken = accessToken;
        user.githubRefreshToken = refreshToken;
        await user.save();
        return done(null, user);
      }
      
      // 创建新用户
      const newUser = new User({
        username: profile.username,
        email: profile.emails[0].value,
        password: 'github-oauth-' + profile.id, // 生成临时密码
        avatar: profile.photos[0].value,
        githubId: profile.id,
        githubName: profile.username,
        githubEmail: profile.emails[0].value,
        githubAvatar: profile.photos[0].value,
        githubAccessToken: accessToken,
        githubRefreshToken: refreshToken
      });
      
      await newUser.save();
      done(null, newUser);
    } catch (err) {
      done(err, null);
    }
  }));
  
  // 序列化用户信息到session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // 从session中反序列化用户信息
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
