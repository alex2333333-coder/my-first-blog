package com.blog.backend.controller;

import com.blog.backend.entity.Comment;
import com.blog.backend.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/comments")
public class CommentController {

    @Autowired
    private CommentService commentService;

    // Get comments for a specific post
    @GetMapping("/{postId}")
    public ResponseEntity<?> getComments(@PathVariable String postId) {
        try {
            List<Comment> comments = commentService.getCommentsByPostId(postId);
            return new ResponseEntity<>(comments, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("message", "Error getting comments"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Create a new comment
    @PostMapping("/{postId}")
    public ResponseEntity<?> createComment(@PathVariable String postId, @RequestBody Map<String, String> commentRequest) {
        try {
            // Get current user
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username == null) {
                return new ResponseEntity<>(Map.of("message", "Please login first"), HttpStatus.UNAUTHORIZED);
            }

            // Get comment content
            String content = commentRequest.get("content");
            if (content == null || content.trim().isEmpty()) {
                return new ResponseEntity<>(Map.of("message", "Comment content is required"), HttpStatus.BAD_REQUEST);
            }

            // Create comment object
            Comment comment = new Comment();
            comment.setPostId(postId);
            comment.setContent(content);
            // Note: User ID will be set in service layer or through security context

            // Save comment
            Comment savedComment = commentService.createComment(comment);

            return new ResponseEntity<>(Map.of(
                    "message", "Comment created successfully",
                    "comment", savedComment
            ), HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("message", "Error creating comment"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
