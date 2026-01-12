package com._P_Doodle.Backend.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com._P_Doodle.Backend.Model.RefreshToken;
import com._P_Doodle.Backend.Model.User;

public interface TokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
    
}
