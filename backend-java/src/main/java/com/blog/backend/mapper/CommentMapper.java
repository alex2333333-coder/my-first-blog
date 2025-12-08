package com.blog.backend.mapper;

import com.blog.backend.entity.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CommentMapper {
    List<Comment> findByPostId(@Param("postId") String postId);
    void insert(Comment comment);
}
