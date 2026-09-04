package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;

public interface WhiteboardRealtimeBroadcaster {
    void broadcast(DrawEvent event);
}
