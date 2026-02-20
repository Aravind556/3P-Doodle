package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.Room;
import com._P_Doodle.Backend.Model.User;
import com._P_Doodle.Backend.Repository.RoomRepository;
import com._P_Doodle.Backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            int index = (int) (Math.random() * chars.length());
            code.append(chars.charAt(index));
        }
        return code.toString();
    }

    @Transactional
    public Map<String, Object> createRoom(String userId) {
        UUID userUuid = UUID.fromString(userId);
        
        // Check if user already has a room
        Optional<Room> existingRoom = roomRepository.findByUserId(userUuid);
        if (existingRoom.isPresent()) {
            Room room = existingRoom.get();
            Map<String, Object> response = new HashMap<>();
            response.put("code", room.getRoomCode());
            response.put("status", room.getIsLocked() ? "PAIRED" : "WAITING");
            if (room.getIsLocked()) {
                response.put("partner", getPartnerName(room, userUuid));
            }
            return response;
        }

        // Generate unique code
        String roomCode;
        do {
            roomCode = generateRoomCode();
        } while (roomRepository.existsByRoomCode(roomCode));

        // Create new room
        Room room = new Room();
        room.setRoomCode(roomCode);
        room.setUser1Id(userUuid);
        room.setIsLocked(false);
        room.setCreatedAt(LocalDateTime.now());
        roomRepository.save(room);

        // Update user
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setRoomId(room.getId());
            userRepository.save(user);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", roomCode);
        response.put("status", "WAITING");
        return response;
    }

    @Transactional
    public Map<String, Object> joinRoom(String userId, String roomCode) {
        UUID userUuid = UUID.fromString(userId);

        // Check if user already in a room
        Optional<Room> userRoom = roomRepository.findByUserId(userUuid);
        if (userRoom.isPresent()) {
            throw new RuntimeException("You are already in a room");
        }

        // Lock and get room
        Optional<Room> roomOpt = roomRepository.findByRoomCodeForUpdate(roomCode);
        if (!roomOpt.isPresent()) {
            throw new RuntimeException("Invalid room code");
        }

        Room room = roomOpt.get();

        // Validate
        if (room.getIsLocked()) {
            throw new RuntimeException("Room is already full");
        }

        if (room.getUser1Id().equals(userUuid)) {
            throw new RuntimeException("Cannot join your own room");
        }

        // Check room age (10 minutes expiry)
        if (room.getCreatedAt().plusMinutes(10).isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Room code expired");
        }

        // Join room
        room.setUser2Id(userUuid);
        room.setIsLocked(true);
        roomRepository.save(room);

        // Update user
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setRoomId(room.getId());
            userRepository.save(user);
        }

        // Get names
        String user1Name = getUserName(room.getUser1Id().toString());
        String user2Name = getUserName(userUuid.toString());
        String user1Email = getUserEmail(room.getUser1Id().toString());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "PAIRED");
        response.put("user1", user1Name);
        response.put("user2", user2Name);
        response.put("roomCode", roomCode);
        // Provide partner name immediately for the joining user (user2)
        response.put("partner", user1Name);
        response.put("partnerEmail", user1Email);
        return response;
    }

    public Map<String, Object> getRoomStatus(String userId) {
        UUID userUuid = UUID.fromString(userId);
        Optional<Room> roomOpt = roomRepository.findByUserId(userUuid);

        Map<String, Object> response = new HashMap<>();
        
        if (!roomOpt.isPresent()) {
            response.put("status", "NO_ROOM");
            return response;
        }

        Room room = roomOpt.get();
        response.put("code", room.getRoomCode());
        response.put("roomCode", room.getRoomCode()); // Add roomCode field for consistency
        
        if (room.getIsLocked()) {
            response.put("status", "PAIRED");
            response.put("partner", getPartnerName(room, userUuid));
            response.put("partnerEmail", getPartnerEmail(room, userUuid));
        } else {
            response.put("status", "WAITING");
        }

        return response;
    }

    private String getUserName(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.map(User::getName).orElse("Unknown");
    }

    private String getPartnerName(Room room, UUID currentUserId) {
        UUID partnerId = room.getUser1Id().equals(currentUserId) ? 
                         room.getUser2Id() : room.getUser1Id();
        return getUserName(partnerId.toString());
    }

    private String getUserEmail(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.map(User::getEmail).orElse("");
    }

    private String getPartnerEmail(Room room, UUID currentUserId) {
        UUID partnerId = room.getUser1Id().equals(currentUserId) ?
                         room.getUser2Id() : room.getUser1Id();
        return getUserEmail(partnerId != null ? partnerId.toString() : "");
    }

    @Transactional
    public void leaveRoom(String userId) {
        UUID userUuid = UUID.fromString(userId);
        Optional<Room> roomOpt = roomRepository.findByUserId(userUuid);
        
        if (roomOpt.isPresent()) {
            Room room = roomOpt.get();
            // Clear room linkage for both participants, then remove the room
            if (room.getUser1Id() != null) {
                userRepository.findById(room.getUser1Id().toString()).ifPresent(u -> {
                    u.setRoomId(null);
                    userRepository.save(u);
                });
            }
            if (room.getUser2Id() != null) {
                userRepository.findById(room.getUser2Id().toString()).ifPresent(u -> {
                    u.setRoomId(null);
                    userRepository.save(u);
                });
            }
            roomRepository.delete(room);
        }
        
        // Clear user's room association
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setRoomId(null);
            userRepository.save(user);
        }
    }
}
