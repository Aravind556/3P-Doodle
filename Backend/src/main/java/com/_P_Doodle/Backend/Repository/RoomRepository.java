package com._P_Doodle.Backend.Repository;

import com._P_Doodle.Backend.Model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {
    
    Optional<Room> findByRoomCode(String roomCode);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.roomCode = :roomCode")
    Optional<Room> findByRoomCodeForUpdate(String roomCode);
    
    Optional<Room> findByUser1Id(UUID userId);
    
    @Query("SELECT r FROM Room r WHERE r.user1Id = :userId OR r.user2Id = :userId")
    Optional<Room> findByUserId(UUID userId);
    
    boolean existsByRoomCode(String roomCode);
}
