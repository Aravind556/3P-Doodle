package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.RoomStatusEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisRoomStatusMessageSubscriber {

    private static final Logger log = LoggerFactory.getLogger(RedisRoomStatusMessageSubscriber.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public RedisRoomStatusMessageSubscriber(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    // Called by MessageListenerAdapter with a plain JSON String (StringRedisSerializer default).
    // Explicit deserialization here is intentional: it avoids the silent dispatch failure that
    // occurs when the adapter tries to match handleMessage(RoomStatusEvent) via reflection on an
    // Object returned by GenericJackson2JsonRedisSerializer.deserialize().
    public void handleMessage(String json) {
        try {
            RoomStatusEvent event = objectMapper.readValue(json, RoomStatusEvent.class);
            messagingTemplate.convertAndSend("/topic/room/" + event.getRoomCode(), event);
        } catch (Exception e) {
            log.error("Failed to deserialize or forward RoomStatusEvent from Redis: {}", json, e);
        }
    }
}
