package com._P_Doodle.Backend.Model;

import java.util.List;

public class DrawEvent {
    private String roomCode;
    private String userId;
    private Double x;
    private Double y;
    private String color;
    private Integer thickness;
    private String tool; // "pen" or "eraser"
    private String strokeId;
    private String eventType; // "START", "MOVE", "END", "CLEAR", "UNDO", "SYNC_REQUEST", "SYNC_STATE"
    private List<StrokeSnapshot> strokes;

    // Constructors
    public DrawEvent() {}

    public DrawEvent(String roomCode, String userId, Double x, Double y, String color,
                     Integer thickness, String tool, String strokeId, String eventType, List<StrokeSnapshot> strokes) {
        this.roomCode = roomCode;
        this.userId = userId;
        this.x = x;
        this.y = y;
        this.color = color;
        this.thickness = thickness;
        this.tool = tool;
        this.strokeId = strokeId;
        this.eventType = eventType;
        this.strokes = strokes;
    }

    // Getters and Setters
    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getThickness() {
        return thickness;
    }

    public void setThickness(Integer thickness) {
        this.thickness = thickness;
    }

    public String getTool() {
        return tool;
    }

    public void setTool(String tool) {
        this.tool = tool;
    }

    public String getStrokeId() {
        return strokeId;
    }

    public void setStrokeId(String strokeId) {
        this.strokeId = strokeId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public List<StrokeSnapshot> getStrokes() {
        return strokes;
    }

    public void setStrokes(List<StrokeSnapshot> strokes) {
        this.strokes = strokes;
    }
}
