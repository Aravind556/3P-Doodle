package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.Room;
import com._P_Doodle.Backend.Model.RoomStatusEvent;
import com._P_Doodle.Backend.Model.User;
import com._P_Doodle.Backend.Repository.RoomRepository;
import com._P_Doodle.Backend.Repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomRealtimeBroadcaster roomRealtimeBroadcaster;

    public RoomService(RoomRepository roomRepository, UserRepository userRepository,
                       RoomRealtimeBroadcaster roomRealtimeBroadcaster) {
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.roomRealtimeBroadcaster = roomRealtimeBroadcaster;
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            int index = (int) (Math.random() * chars.length());
            code.append(chars.charAt(index));
        }
        return code.toString();
    }

    private static final long ROOM_EXPIRY_MINUTES = 10;

    private boolean isExpired(Room room) {
        return !room.getIsLocked() && room.getCreatedAt().plusMinutes(ROOM_EXPIRY_MINUTES).isBefore(LocalDateTime.now());
    }

    @Transactional
    public Map<String, Object> createRoom(String userId) {
        UUID userUuid = UUID.fromString(userId);
        
        // Check if user already has a room
        Optional<Room> existingRoom = roomRepository.findByUserId(userUuid);
        if (existingRoom.isPresent()) {
            Room room = existingRoom.get();

            // An unpaired room past its join window is dead weight - clear it out
            // instead of repeatedly handing back a code that joinRoom() will reject.
            if (isExpired(room)) {
                roomRepository.delete(room);
                userRepository.findById(userId).ifPresent(u -> {
                    u.setRoomId(null);
                    userRepository.save(u);
                });
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("code", room.getRoomCode());
                response.put("status", room.getIsLocked() ? "PAIRED" : "WAITING");
                if (room.getIsLocked()) {
                    response.put("partner", getPartnerName(room, userUuid));
                }
                return response;
            }
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

        // Check if user already in a room. A stale, never-joined room that has
        // already passed its expiry window shouldn't block the user from joining
        // a different room - clean it up automatically instead of hard-blocking.
        Optional<Room> userRoom = roomRepository.findByUserId(userUuid);
        if (userRoom.isPresent()) {
            Room existing = userRoom.get();
            log.info("joinRoom: user {} attempting to join {} but already has room {} (locked={}, createdAt={})",
                    userId, roomCode, existing.getRoomCode(), existing.getIsLocked(), existing.getCreatedAt());
            if (isExpired(existing)) {
                roomRepository.delete(existing);
                userRepository.findById(userId).ifPresent(u -> {
                    u.setRoomId(null);
                    userRepository.save(u);
                });
                log.info("joinRoom: cleaned up expired existing room {} for user {}", existing.getRoomCode(), userId);
            } else {
                throw new RuntimeException("You are already in a room");
            }
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
        if (isExpired(room)) {
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

        // A realtime notification failure must never roll back a successful pairing.
        try {
            roomRealtimeBroadcaster.broadcast(roomCode, new RoomStatusEvent(
                    roomCode,
                    "PAIRED",
                    user2Name,
                    getUserEmail(userUuid.toString()),
                    "Partner joined room"
            ));
        } catch (Exception e) {
            log.warn("Failed to publish PAIRED room status for room {}: {}", roomCode, e.getMessage(), e);
        }

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
            String roomCode = room.getRoomCode();
            log.info("leaveRoom: user {} is leaving room {} (user1={}, user2={}) - deleting room and clearing both participants",
                    userId, roomCode, room.getUser1Id(), room.getUser2Id());
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
            log.info("leaveRoom: room {} deleted for user {}", roomCode, userId);

            // A realtime notification failure must never roll back the leave itself.
            try {
                roomRealtimeBroadcaster.broadcast(roomCode, new RoomStatusEvent(
                        roomCode,
                        "NO_ROOM",
                        null,
                        null,
                        "Room closed"
                ));
            } catch (Exception e) {
                log.warn("Failed to publish NO_ROOM room status for room {}: {}", roomCode, e.getMessage(), e);
            }
        } else {
            log.info("leaveRoom called for user {} but no room was found for them", userId);
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
