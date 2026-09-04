package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.RoomStatusEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LocalRoomRealtimeBroadcaster implements RoomRealtimeBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    public LocalRoomRealtimeBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void broadcast(String roomCode, RoomStatusEvent event) {
        messagingTemplate.convertAndSend("/topic/room/" + roomCode, event);
    }
}
