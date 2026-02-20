package com._P_Doodle.Backend.Model;

public class StrokePoint {
    private double x;
    private double y;

    public StrokePoint() {}

    public StrokePoint(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }
}
