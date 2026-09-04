package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisWhiteboardMessageSubscriber {

    private static final Logger log = LoggerFactory.getLogger(RedisWhiteboardMessageSubscriber.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public RedisWhiteboardMessageSubscriber(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    // Called by MessageListenerAdapter with a plain JSON String (StringRedisSerializer default).
    // Explicit deserialization here is intentional: it avoids the silent dispatch failure that
    // occurs when the adapter tries to match handleMessage(DrawEvent) via reflection on an
    // Object returned by GenericJackson2JsonRedisSerializer.deserialize().
    public void handleMessage(String json) {
        try {
            DrawEvent event = objectMapper.readValue(json, DrawEvent.class);
            messagingTemplate.convertAndSend("/topic/draw/" + event.getRoomCode(), event);
        } catch (Exception e) {
            log.error("Failed to deserialize or forward DrawEvent from Redis: {}", json, e);
        }
    }
}
