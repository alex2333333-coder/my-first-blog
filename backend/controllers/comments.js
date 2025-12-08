const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/mock-db');

// @route    GET api/comments/:postId
// @desc     Get comments for a post
// @access   Public
router.get('/:postId', async (req, res) => {
  try {
    let comments = db.findCommentsByPostId(req.params.postId);
    
    // 手动填充作者信息
    comments = comments.map(comment => {
      const author = db.findUserById(comment.author);
      return {
        ...comment,
        author: {
          _id: author._id,
          username: author.username,
          avatar: author.avatar || null
        },
        replies: comment.replies.map(reply => {
          const replyAuthor = db.findUserById(reply.author);
          return {
            ...reply,
            author: {
              _id: replyAuthor._id,
              username: replyAuthor.username,
              avatar: replyAuthor.avatar || null
            }
          };
        })
      };
    });
    
    // 按创建时间降序排序
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/comments
// @desc     Create a comment
// @access   Private
router.post('/', auth, async (req, res) => {
  const { content, postId } = req.body;

  try {
    const comment = db.createComment({
      content,
      author: req.user.id,
      postId
    });

    // 手动填充作者信息
    const author = db.findUserById(comment.author);
    const populatedComment = {
      ...comment,
      author: {
        _id: author._id,
        username: author.username,
        avatar: author.avatar || null
      }
    };

    res.json(populatedComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/comments/like/:id
// @desc     Like/Unlike a comment
// @access   Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    let comment = db.findCommentById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    // Check if the comment has already been liked
    const isLiked = comment.likes.some(like => like._id === req.user.id);
    
    if (isLiked) {
      // Unlike the comment
      comment = db.removeLike(req.params.id, req.user.id);
    } else {
      // Like the comment
      comment = db.addLike(req.params.id, req.user.id);
    }

    // 手动填充作者信息
    const author = db.findUserById(comment.author);
    const populatedComment = {
      ...comment,
      author: {
        _id: author._id,
        username: author.username,
        avatar: author.avatar || null
      }
    };

    res.json(populatedComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/comments/:id
// @desc     Delete a comment
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = db.findCommentById(req.params.id);

    // Check if comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.author !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // 内存数据库简化实现，直接返回成功
    res.json({ msg: 'Comment removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/comments/reply/:id
// @desc     Reply to a comment
// @access   Private
router.post('/reply/:id', auth, async (req, res) => {
  const { content } = req.body;

  try {
    let comment = db.findCommentById(req.params.id);

    // Check if comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    const newReply = {
      content,
      author: req.user.id
    };

    comment = db.addReply(req.params.id, newReply);

    // 手动填充作者信息
    const author = db.findUserById(comment.author);
    const populatedComment = {
      ...comment,
      author: {
        _id: author._id,
        username: author.username,
        avatar: author.avatar || null
      },
      replies: comment.replies.map(reply => {
        const replyAuthor = db.findUserById(reply.author);
        return {
          ...reply,
          author: {
            _id: replyAuthor._id,
            username: replyAuthor.username,
            avatar: replyAuthor.avatar || null
          }
        };
      })
    };

    res.json(populatedComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/comments/reply/like/:id/:replyId
// @desc     Like/Unlike a reply
// @access   Private
router.put('/reply/like/:id/:replyId', auth, async (req, res) => {
  try {
    // 简化实现：目前内存数据库不支持直接对回复点赞
    // 这里返回成功响应，实际项目中可以扩展内存数据库的功能
    res.json({ msg: 'Reply like/unlike functionality not implemented in mock DB' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;