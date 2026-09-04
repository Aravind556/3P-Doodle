package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;
import com._P_Doodle.Backend.Model.Room;
import com._P_Doodle.Backend.Model.StrokeSnapshot;
import com._P_Doodle.Backend.Model.WhiteboardSnapshot;
import com._P_Doodle.Backend.Model.WhiteboardStateResponse;
import com._P_Doodle.Backend.Repository.RoomRepository;
import com._P_Doodle.Backend.Repository.WhiteboardSnapshotRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardStateServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private WhiteboardSnapshotRepository snapshotRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WhiteboardStateService whiteboardStateService;

    private final String roomCode = "ABC123";
    private final String userId = "11111111-1111-1111-1111-111111111111";
    private final String otherUserId = "22222222-2222-2222-2222-222222222222";

    @BeforeEach
    void setUp() {
        whiteboardStateService = new WhiteboardStateService(roomRepository, snapshotRepository, objectMapper);

        Room room = new Room();
        room.setRoomCode(roomCode);
        room.setUser1Id(UUID.fromString(userId));
        room.setUser2Id(UUID.fromString(otherUserId));

        when(roomRepository.findByRoomCode(roomCode)).thenReturn(Optional.of(room));
        // Not every test reaches the snapshot lookup (e.g. tests that fail room
        // membership validation before state loading happens), so this stub is
        // lenient to avoid Mockito's strict "unnecessary stubbing" check.
        lenient().when(snapshotRepository.findByRoomCode(roomCode)).thenReturn(Optional.empty());
    }

    @Test
    void shouldPersistCompletedStrokeOnEnd() throws Exception {
        whiteboardStateService.applyEvent(drawEvent("START", userId, 10.0, 10.0, "stroke-1"));
        DrawEvent endEvent = whiteboardStateService.applyEvent(drawEvent("END", userId, 20.0, 20.0, "stroke-1"));

        assertEquals(2L, endEvent.getVersion());

        ArgumentCaptor<WhiteboardSnapshot> captor = ArgumentCaptor.forClass(WhiteboardSnapshot.class);
        verify(snapshotRepository).save(captor.capture());

        WhiteboardSnapshot snapshot = captor.getValue();
        assertEquals(roomCode, snapshot.getRoomCode());
        assertEquals(2L, snapshot.getVersion());

        List<StrokeSnapshot> strokes = objectMapper.readValue(snapshot.getSnapshotJson(), new TypeReference<List<StrokeSnapshot>>() {});
        assertEquals(1, strokes.size());
        assertEquals("stroke-1", strokes.get(0).getStrokeId());
        assertEquals(2, strokes.get(0).getPoints().size());
    }

    @Test
    void shouldUndoOnlyUsersOwnStroke() {
        whiteboardStateService.applyEvent(drawEvent("START", userId, 1.0, 1.0, "mine"));
        whiteboardStateService.applyEvent(drawEvent("END", userId, 2.0, 2.0, "mine"));

        whiteboardStateService.applyEvent(drawEvent("START", otherUserId, 5.0, 5.0, "theirs"));
        whiteboardStateService.applyEvent(drawEvent("END", otherUserId, 6.0, 6.0, "theirs"));

        DrawEvent undo = new DrawEvent();
        undo.setRoomCode(roomCode);
        undo.setUserId(userId);
        undo.setEventType("UNDO");
        whiteboardStateService.applyEvent(undo);

        WhiteboardStateResponse state = whiteboardStateService.getState(roomCode, userId);
        assertEquals(1, state.getStrokes().size());
        assertEquals("theirs", state.getStrokes().get(0).getStrokeId());
    }

    @Test
    void shouldRejectUserOutsideRoom() {
        DrawEvent event = drawEvent("START", "33333333-3333-3333-3333-333333333333", 1.0, 1.0, "stroke-2");

        assertThrows(IllegalArgumentException.class, () -> whiteboardStateService.applyEvent(event));
        verify(snapshotRepository, never()).save(any());
    }

    private DrawEvent drawEvent(String type, String eventUserId, double x, double y, String strokeId) {
        DrawEvent event = new DrawEvent();
        event.setRoomCode(roomCode);
        event.setUserId(eventUserId);
        event.setEventType(type);
        event.setStrokeId(strokeId);
        event.setX(x);
        event.setY(y);
        event.setColor("#000000");
        event.setThickness(3);
        event.setTool("pen");
        return event;
    }
}
