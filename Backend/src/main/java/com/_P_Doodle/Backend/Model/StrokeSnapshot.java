package com._P_Doodle.Backend.Model;

import java.util.List;

public class StrokeSnapshot {
    private String strokeId;
    private String userId;
    private List<StrokePoint> points;
    private String color;
    private Integer thickness;
    private String tool;

    public StrokeSnapshot() {}

    public StrokeSnapshot(String strokeId, String userId, List<StrokePoint> points, String color, Integer thickness, String tool) {
        this.strokeId = strokeId;
        this.userId = userId;
        this.points = points;
        this.color = color;
        this.thickness = thickness;
        this.tool = tool;
    }

    public String getStrokeId() {
        return strokeId;
    }

    public void setStrokeId(String strokeId) {
        this.strokeId = strokeId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<StrokePoint> getPoints() {
        return points;
    }

    public void setPoints(List<StrokePoint> points) {
        this.points = points;
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
}
