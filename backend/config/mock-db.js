// 内存数据库模拟，用于测试

class MockDB {
  constructor() {
    this.users = [];
    this.comments = [];
    this.counter = {
      users: 1,
      comments: 1
    };
  }

  // 用户相关操作
  createUser(userData) {
    const user = {
      _id: `user_${this.counter.users++}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  findUserById(id) {
    return this.users.find(user => user._id === id);
  }

  // 评论相关操作
  createComment(commentData) {
    const comment = {
      _id: `comment_${this.counter.comments++}`,
      ...commentData,
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.comments.push(comment);
    return comment;
  }

  findCommentsByPostId(postId) {
    return this.comments.filter(comment => comment.postId === postId);
  }

  findCommentById(commentId) {
    return this.comments.find(comment => comment._id === commentId);
  }

  updateComment(commentId, updateData) {
    const commentIndex = this.comments.findIndex(comment => comment._id === commentId);
    if (commentIndex !== -1) {
      this.comments[commentIndex] = {
        ...this.comments[commentIndex],
        ...updateData,
        updatedAt: new Date()
      };
      return this.comments[commentIndex];
    }
    return null;
  }

  addLike(commentId, userId) {
    const comment = this.findCommentById(commentId);
    if (comment) {
      if (!comment.likes.some(like => like._id === userId)) {
        comment.likes.push({ _id: userId });
      }
      return comment;
    }
    return null;
  }

  removeLike(commentId, userId) {
    const comment = this.findCommentById(commentId);
    if (comment) {
      comment.likes = comment.likes.filter(like => like._id !== userId);
      return comment;
    }
    return null;
  }

  addReply(commentId, replyData) {
    const comment = this.findCommentById(commentId);
    if (comment) {
      const reply = {
        _id: `reply_${this.counter.comments++}`,
        ...replyData,
        likes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      comment.replies.push(reply);
      return comment;
    }
    return null;
  }
}

module.exports = new MockDB();
