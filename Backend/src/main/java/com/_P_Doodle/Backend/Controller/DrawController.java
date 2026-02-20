package com._P_Doodle.Backend.Controller;

import com._P_Doodle.Backend.Model.DrawEvent;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class DrawController {

    private final SimpMessagingTemplate messagingTemplate;

    public DrawController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Receive draw events from clients and broadcast to all users in the same room.
     * The client will filter out their own events to prevent duplication.
     */
    @MessageMapping("/draw")
    public void handleDrawEvent(@Payload DrawEvent drawEvent) {
        // Broadcast to all subscribers of the room's drawing topic
        messagingTemplate.convertAndSend(
            "/topic/draw/" + drawEvent.getRoomCode(),
            drawEvent
        );
    }
}
