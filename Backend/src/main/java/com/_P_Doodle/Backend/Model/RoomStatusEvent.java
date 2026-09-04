package com._P_Doodle.Backend.Model;

public class RoomStatusEvent {
    private String roomCode;
    private String status;
    private String partner;
    private String partnerEmail;
    private String message;

    public RoomStatusEvent() {
    }

    public RoomStatusEvent(String roomCode, String status, String partner, String partnerEmail, String message) {
        this.roomCode = roomCode;
        this.status = status;
        this.partner = partner;
        this.partnerEmail = partnerEmail;
        this.message = message;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPartner() {
        return partner;
    }

    public void setPartner(String partner) {
        this.partner = partner;
    }

    public String getPartnerEmail() {
        return partnerEmail;
    }

    public void setPartnerEmail(String partnerEmail) {
        this.partnerEmail = partnerEmail;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
