package com._P_Doodle.Backend.Repository;

import com._P_Doodle.Backend.Model.WhiteboardSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WhiteboardSnapshotRepository extends JpaRepository<WhiteboardSnapshot, UUID> {
    Optional<WhiteboardSnapshot> findByRoomCode(String roomCode);
}
