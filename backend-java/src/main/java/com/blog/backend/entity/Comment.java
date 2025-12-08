package com.blog.backend.entity;

import lombok.Data;
import java.util.Date;

@Data
public class Comment {
    private Long id;
    private Long userId;
    private String postId;
    private String content;
    private Date createdAt;
    private User user; // 用于关联查询
}
