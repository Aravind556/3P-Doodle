package com._P_Doodle.Backend.Model;

import java.util.ArrayList;
import java.util.List;

public class WhiteboardStateResponse {
    private String roomCode;
    private Long version;
    private List<StrokeSnapshot> strokes = new ArrayList<>();

    public WhiteboardStateResponse() {
    }

    public WhiteboardStateResponse(String roomCode, Long version, List<StrokeSnapshot> strokes) {
        this.roomCode = roomCode;
        this.version = version;
        this.strokes = strokes;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public List<StrokeSnapshot> getStrokes() {
        return strokes;
    }

    public void setStrokes(List<StrokeSnapshot> strokes) {
        this.strokes = strokes;
    }
}
