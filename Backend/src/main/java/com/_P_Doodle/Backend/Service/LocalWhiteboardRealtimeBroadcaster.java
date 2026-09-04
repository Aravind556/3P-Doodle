package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LocalWhiteboardRealtimeBroadcaster implements WhiteboardRealtimeBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(LocalWhiteboardRealtimeBroadcaster.class);

    private final SimpMessagingTemplate messagingTemplate;

    public LocalWhiteboardRealtimeBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void broadcast(DrawEvent event) {
        String destination = "/topic/draw/" + event.getRoomCode();
        try {
            messagingTemplate.convertAndSend(destination, event);
            log.info("Broadcast {} event for room {} (user={}, stroke={}) to {}",
                    event.getEventType(), event.getRoomCode(), event.getUserId(), event.getStrokeId(), destination);
        } catch (Exception e) {
            log.error("Failed to broadcast {} event to {}", event.getEventType(), destination, e);
            throw e;
        }
    }
}
