package com._P_Doodle.Backend.Controller;

import com._P_Doodle.Backend.Model.DrawEvent;
import com._P_Doodle.Backend.Service.WhiteboardRealtimeBroadcaster;
import com._P_Doodle.Backend.Service.WhiteboardStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class DrawController {

    private static final Logger log = LoggerFactory.getLogger(DrawController.class);

    private final WhiteboardStateService whiteboardStateService;
    private final WhiteboardRealtimeBroadcaster realtimeBroadcaster;

    public DrawController(WhiteboardStateService whiteboardStateService, WhiteboardRealtimeBroadcaster realtimeBroadcaster) {
        this.whiteboardStateService = whiteboardStateService;
        this.realtimeBroadcaster = realtimeBroadcaster;
    }

    @MessageMapping("/draw")
    public void handleDrawEvent(@Payload DrawEvent drawEvent, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new IllegalArgumentException("Unauthenticated websocket user");
        }

        drawEvent.setUserId(principal.getName());
        log.info("handleDrawEvent: received {} for room {} from user {} (broadcaster={})",
                drawEvent.getEventType(), drawEvent.getRoomCode(), principal.getName(), realtimeBroadcaster.getClass().getSimpleName());
        DrawEvent authoritativeEvent = whiteboardStateService.applyEvent(drawEvent);
        realtimeBroadcaster.broadcast(authoritativeEvent);
    }
}
