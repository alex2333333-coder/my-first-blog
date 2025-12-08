package com.blog.backend.entity;

import lombok.Data;
import java.util.Date;

@Data
public class User {
    private Long id;
    private String username;
    private String email;
    private String passwordHash;
    private Date createdAt;
}
