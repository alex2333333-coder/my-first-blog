package com.blog.backend.service;

import com.blog.backend.entity.Comment;
import com.blog.backend.mapper.CommentMapper;
import com.blog.backend.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CommentService {

    @Autowired
    private CommentMapper commentMapper;
    
    @Autowired
    private UserMapper userMapper;

    public List<Comment> getCommentsByPostId(String postId) {
        return commentMapper.findByPostId(postId);
    }

    public Comment createComment(Comment comment) {
        // Get current username from security context
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Find user by username
        var user = userMapper.findByUsername(username);
        if (user != null) {
            // Set user ID to comment
            comment.setUserId(user.getId());
        }
        
        // Insert comment
        commentMapper.insert(comment);
        return comment;
    }
}
