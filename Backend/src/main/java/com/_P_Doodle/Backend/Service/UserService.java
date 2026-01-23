package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.User;
import com._P_Doodle.Backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // Static lock object to synchronize across all service instances
    private static final Object USER_CREATION_LOCK = new Object();

    public User getOrCreateUser(Jwt jwt) {
        String userId = jwt.getSubject();
        
        // Try to find existing user first (most common case)
        Optional<User> existingUser = userRepository.findById(userId);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        // Only create if doesn't exist - use static lock to prevent race condition
        synchronized (USER_CREATION_LOCK) {
            // Double-check after acquiring lock
            existingUser = userRepository.findById(userId);
            if (existingUser.isPresent()) {
                return existingUser.get();
            }

            // Create new user from JWT claims
            User user = new User();
            user.setId(userId);
            
            // Extract name from JWT
            String name = jwt.getClaimAsString("name");
            if (name == null || name.isEmpty()) {
                name = jwt.getClaimAsString("email");
                if (name != null && name.contains("@")) {
                    name = name.substring(0, name.indexOf("@"));
                }
            }
            user.setName(name != null ? name : "User");
            
            // Extract email
            String email = jwt.getClaimAsString("email");
            user.setEmail(email);

            try {
                return userRepository.save(user);
            } catch (Exception e) {
                // Catch any database exception (duplicate key, optimistic lock, etc.)
                // Try fetching one more time - another thread may have created it
                try {
                    Thread.sleep(50); // Small delay to ensure other transaction commits
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
                existingUser = userRepository.findById(userId);
                if (existingUser.isPresent()) {
                    return existingUser.get();
                }
                // If still not found, throw the original exception
                throw new RuntimeException("Failed to create or fetch user: " + e.getMessage(), e);
            }
        }
    }
}
