package com._P_Doodle.Backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com._P_Doodle.Backend.Model.User;

public interface UserRepository extends JpaRepository<User, String> {
    
}
