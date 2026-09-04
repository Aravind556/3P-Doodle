package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.RoomStatusEvent;

public interface RoomRealtimeBroadcaster {
    void broadcast(String roomCode, RoomStatusEvent event);
}
