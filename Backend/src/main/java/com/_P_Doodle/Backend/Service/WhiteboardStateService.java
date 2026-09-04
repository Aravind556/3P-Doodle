package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;
import com._P_Doodle.Backend.Model.DrawEventType;
import com._P_Doodle.Backend.Model.StrokePoint;
import com._P_Doodle.Backend.Model.StrokeSnapshot;
import com._P_Doodle.Backend.Model.WhiteboardSnapshot;
import com._P_Doodle.Backend.Model.WhiteboardStateResponse;
import com._P_Doodle.Backend.Repository.RoomRepository;
import com._P_Doodle.Backend.Repository.WhiteboardSnapshotRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class WhiteboardStateService {

    private static final Logger log = LoggerFactory.getLogger(WhiteboardStateService.class);

    private final RoomRepository roomRepository;
    private final WhiteboardSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, RoomWhiteboardState> roomStates = new ConcurrentHashMap<>();

    public WhiteboardStateService(
            RoomRepository roomRepository,
            WhiteboardSnapshotRepository snapshotRepository,
            ObjectMapper objectMapper) {
        this.roomRepository = roomRepository;
        this.snapshotRepository = snapshotRepository;
        this.objectMapper = objectMapper;
    }

    public boolean userBelongsToRoom(String roomCode, String userId) {
        UUID userUuid = UUID.fromString(userId);
        return roomRepository.findByRoomCode(roomCode)
                .map(room -> userUuid.equals(room.getUser1Id()) || userUuid.equals(room.getUser2Id()))
                .orElse(false);
    }

    public WhiteboardStateResponse getState(String roomCode, String userId) {
        if (!userBelongsToRoom(roomCode, userId)) {
            throw new IllegalArgumentException("User is not part of this room");
        }

        RoomWhiteboardState state = getOrLoadState(roomCode);
        synchronized (state) {
            return new WhiteboardStateResponse(roomCode, state.version.get(), copyStrokes(state.committedStrokes));
        }
    }

    // Intentionally not @Transactional at this level: START/MOVE events never touch
    // the database, so wrapping every draw message in a Spring-managed transaction
    // would needlessly acquire a connection from a small pool for pure in-memory work.
    // The DB writes inside persistState() are already individually transactional via
    // Spring Data JPA's repository proxies (findByRoomCode / save), and concurrent
    // access to a room's state is already serialized by the synchronized block below.
    public DrawEvent applyEvent(DrawEvent event) {
        validateEvent(event);

        RoomWhiteboardState state = getOrLoadState(event.getRoomCode());
        synchronized (state) {
            DrawEventType type = DrawEventType.valueOf(event.getEventType().toUpperCase());
            switch (type) {
                case START -> applyStart(state, event);
                case MOVE  -> applyMove(state, event);
                case END   -> applyEnd(state, event);
                case CLEAR -> applyClear(state);
                case UNDO  -> applyUndo(state, event.getUserId(), event.getStrokeId());
                default    -> throw new IllegalArgumentException("Unsupported event type: " + event.getEventType());
            }

            long version = state.version.incrementAndGet();
            event.setVersion(version);

            DrawEventType t = DrawEventType.valueOf(event.getEventType().toUpperCase());
            if (t == DrawEventType.END || t == DrawEventType.CLEAR || t == DrawEventType.UNDO) {
                // Durable persistence and live broadcast are separate concerns: a
                // snapshot save failure must never prevent the authoritative event
                // from reaching connected clients, or realtime sync silently breaks
                // even though the in-memory state (and thus live sync) is fine.
                try {
                    persistState(event.getRoomCode(), state, version);
                } catch (Exception e) {
                    log.error("Failed to persist whiteboard snapshot for room {} (continuing to broadcast live state)", event.getRoomCode(), e);
                }
            }

            return event;
        }
    }

    private void validateEvent(DrawEvent event) {
        if (event.getRoomCode() == null || event.getRoomCode().isBlank()) {
            throw new IllegalArgumentException("roomCode is required");
        }
        if (event.getUserId() == null || event.getUserId().isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (event.getEventType() == null || event.getEventType().isBlank()) {
            throw new IllegalArgumentException("eventType is required");
        }
        try {
            DrawEventType.valueOf(event.getEventType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported event type: " + event.getEventType());
        }
        if (!userBelongsToRoom(event.getRoomCode(), event.getUserId())) {
            throw new IllegalArgumentException("User is not part of this room");
        }
    }

    private void applyStart(RoomWhiteboardState state, DrawEvent event) {
        requireStrokePayload(event);
        StrokeSnapshot stroke = new StrokeSnapshot();
        stroke.setStrokeId(event.getStrokeId());
        stroke.setUserId(event.getUserId());
        stroke.setColor(event.getColor());
        stroke.setThickness(event.getThickness());
        stroke.setTool(event.getTool());
        List<StrokePoint> points = new ArrayList<>();
        points.add(new StrokePoint(event.getX(), event.getY()));
        stroke.setPoints(points);
        state.activeStrokes.put(event.getStrokeId(), stroke);
    }

    private void applyMove(RoomWhiteboardState state, DrawEvent event) {
        requireStrokePayload(event);
        StrokeSnapshot stroke = state.activeStrokes.get(event.getStrokeId());
        if (stroke == null) {
            stroke = new StrokeSnapshot();
            stroke.setStrokeId(event.getStrokeId());
            stroke.setUserId(event.getUserId());
            stroke.setColor(event.getColor());
            stroke.setThickness(event.getThickness());
            stroke.setTool(event.getTool());
            stroke.setPoints(new ArrayList<>());
            state.activeStrokes.put(event.getStrokeId(), stroke);
        }
        appendPoints(stroke, event);
    }

    private void applyEnd(RoomWhiteboardState state, DrawEvent event) {
        requireStrokePayload(event);
        StrokeSnapshot stroke = state.activeStrokes.get(event.getStrokeId());
        if (stroke == null) {
            applyStart(state, event);
            stroke = state.activeStrokes.get(event.getStrokeId());
        }
        appendPoints(stroke, event);
        state.activeStrokes.remove(event.getStrokeId());
        state.committedStrokes.removeIf(s -> s.getStrokeId().equals(event.getStrokeId()));
        state.committedStrokes.add(cloneStroke(stroke));
    }

    private void applyClear(RoomWhiteboardState state) {
        state.activeStrokes.clear();
        state.committedStrokes.clear();
    }

    private void applyUndo(RoomWhiteboardState state, String userId, String strokeId) {
        if (strokeId != null && !strokeId.isBlank()) {
            state.committedStrokes.removeIf(s -> strokeId.equals(s.getStrokeId()) && userId.equals(s.getUserId()));
            state.activeStrokes.remove(strokeId);
            return;
        }

        for (int i = state.committedStrokes.size() - 1; i >= 0; i--) {
            if (userId.equals(state.committedStrokes.get(i).getUserId())) {
                state.committedStrokes.remove(i);
                return;
            }
        }
    }

    private void requireStrokePayload(DrawEvent event) {
        if (event.getStrokeId() == null || event.getStrokeId().isBlank()) {
            throw new IllegalArgumentException("strokeId is required");
        }
        boolean hasSinglePoint = event.getX() != null && event.getY() != null;
        boolean hasBatchPoints = event.getPoints() != null && !event.getPoints().isEmpty();
        if (!hasSinglePoint && !hasBatchPoints) {
            throw new IllegalArgumentException("point payload is required");
        }
        if (event.getColor() == null || event.getColor().isBlank()) {
            throw new IllegalArgumentException("color is required");
        }
        if (event.getThickness() == null) {
            throw new IllegalArgumentException("thickness is required");
        }
        if (event.getTool() == null || event.getTool().isBlank()) {
            throw new IllegalArgumentException("tool is required");
        }
    }

    private RoomWhiteboardState getOrLoadState(String roomCode) {
        return roomStates.computeIfAbsent(roomCode, this::loadRoomState);
    }

    private RoomWhiteboardState loadRoomState(String roomCode) {
        RoomWhiteboardState state = new RoomWhiteboardState();
        try {
            snapshotRepository.findByRoomCode(roomCode).ifPresent(snapshot -> {
                try {
                    List<StrokeSnapshot> strokes = objectMapper.readValue(snapshot.getSnapshotJson(), new TypeReference<List<StrokeSnapshot>>() {});
                    state.committedStrokes.addAll(copyStrokes(strokes));
                    state.version.set(snapshot.getVersion() == null ? 0L : snapshot.getVersion());
                    log.info("Loaded {} saved strokes for room {} from DB (version={})", strokes.size(), roomCode, snapshot.getVersion());
                } catch (Exception e) {
                    log.error("Failed to parse whiteboard snapshot JSON for room {} - starting with an empty board", roomCode, e);
                }
            });
        } catch (Exception e) {
            log.error("Failed to load whiteboard snapshot for room {} from the database", roomCode, e);
        }
        return state;
    }

    private void persistState(String roomCode, RoomWhiteboardState state, long version) {
        try {
            WhiteboardSnapshot snapshot = snapshotRepository.findByRoomCode(roomCode).orElseGet(WhiteboardSnapshot::new);
            snapshot.setRoomCode(roomCode);
            snapshot.setVersion(version);
            List<StrokeSnapshot> allStrokes = new ArrayList<>(copyStrokes(state.committedStrokes));
            allStrokes.addAll(copyStrokes(new ArrayList<>(state.activeStrokes.values())));
            snapshot.setSnapshotJson(objectMapper.writeValueAsString(allStrokes));
            snapshot.setUpdatedAt(LocalDateTime.now());
            snapshotRepository.save(snapshot);
            log.info("Persisted {} strokes for room {} to DB (version={})", allStrokes.size(), roomCode, version);
        } catch (Exception e) {
            log.error("Failed to persist whiteboard state for room {}", roomCode, e);
            throw new RuntimeException("Failed to persist whiteboard state for room " + roomCode, e);
        }
    }

    private List<StrokeSnapshot> copyStrokes(List<StrokeSnapshot> strokes) {
        return strokes.stream()
                .map(this::cloneStroke)
                .toList();
    }

    private StrokeSnapshot cloneStroke(StrokeSnapshot stroke) {
        StrokeSnapshot clone = new StrokeSnapshot();
        clone.setStrokeId(stroke.getStrokeId());
        clone.setUserId(stroke.getUserId());
        clone.setColor(stroke.getColor());
        clone.setThickness(stroke.getThickness());
        clone.setTool(stroke.getTool());
        List<StrokePoint> points = new ArrayList<>();
        if (stroke.getPoints() != null) {
            for (StrokePoint point : stroke.getPoints()) {
                points.add(new StrokePoint(point.getX(), point.getY()));
            }
        }
        clone.setPoints(points);
        return clone;
    }

    private void appendPoints(StrokeSnapshot stroke, DrawEvent event) {
        List<StrokePoint> points = stroke.getPoints();
        if (points == null) {
            points = new ArrayList<>();
            stroke.setPoints(points);
        }

        if (event.getPoints() != null && !event.getPoints().isEmpty()) {
            for (StrokePoint point : event.getPoints()) {
                if (point == null) {
                    continue;
                }
                if (points.isEmpty() || !samePoint(points.get(points.size() - 1), point.getX(), point.getY())) {
                    points.add(new StrokePoint(point.getX(), point.getY()));
                }
            }
            return;
        }

        if (event.getX() != null && event.getY() != null && (points.isEmpty() || !samePoint(points.get(points.size() - 1), event.getX(), event.getY()))) {
            points.add(new StrokePoint(event.getX(), event.getY()));
        }
    }

    private boolean samePoint(StrokePoint point, Double x, Double y) {
        return Double.compare(point.getX(), x) == 0 && Double.compare(point.getY(), y) == 0;
    }

    private static class RoomWhiteboardState {
        private final Map<String, StrokeSnapshot> activeStrokes = new ConcurrentHashMap<>();
        private final List<StrokeSnapshot> committedStrokes = new ArrayList<>();
        private final AtomicLong version = new AtomicLong(0L);
    }
}
