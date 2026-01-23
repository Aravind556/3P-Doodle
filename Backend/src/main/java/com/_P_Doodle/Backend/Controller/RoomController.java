package com._P_Doodle.Backend.Controller;

import com._P_Doodle.Backend.Service.RoomService;
import com._P_Doodle.Backend.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/room")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @Autowired
    private UserService userService;

    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@AuthenticationPrincipal Jwt jwt) {
        try {
            // Ensure user exists before creating a room (synchronous)
            userService.getOrCreateUser(jwt);
            
            String userId = jwt.getSubject();
            Map<String, Object> response = roomService.createRoom(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, String> request) {
        try {
            // Ensure user exists before joining a room (synchronous)
            userService.getOrCreateUser(jwt);
            
            String userId = jwt.getSubject();
            String roomCode = request.get("code");
            
            if (roomCode == null || roomCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code is required"));
            }
            
            Map<String, Object> response = roomService.joinRoom(userId, roomCode.toUpperCase());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getRoomStatus(@AuthenticationPrincipal Jwt jwt) {
        try {
            // Don't create user on status check - just use JWT subject
            String userId = jwt.getSubject();
            Map<String, Object> response = roomService.getRoomStatus(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/leave")
    public ResponseEntity<?> leaveRoom(@AuthenticationPrincipal Jwt jwt) {
        try {
            String userId = jwt.getSubject();
            roomService.leaveRoom(userId);
            return ResponseEntity.ok(Map.of("message", "Left room successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
