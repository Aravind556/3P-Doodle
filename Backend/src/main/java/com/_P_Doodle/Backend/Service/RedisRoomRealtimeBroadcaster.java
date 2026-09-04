package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.RoomStatusEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisRoomRealtimeBroadcaster implements RoomRealtimeBroadcaster {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ChannelTopic roomChannelTopic;
    private final ObjectMapper objectMapper;

    public RedisRoomRealtimeBroadcaster(
            RedisTemplate<String, Object> redisTemplate,
            @Qualifier("roomChannelTopic") ChannelTopic roomChannelTopic,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.roomChannelTopic = roomChannelTopic;
        this.objectMapper = objectMapper;
    }

    @Override
    public void broadcast(String roomCode, RoomStatusEvent event) {
        try {
            // Serialize to plain JSON string so the wire format is clean UTF-8 JSON.
            // The MessageListenerAdapter's default StringRedisSerializer then passes
            // this string directly to RedisRoomStatusMessageSubscriber.handleMessage(String).
            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(roomChannelTopic.getTopic(), json);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize RoomStatusEvent for Redis pub/sub", e);
        }
    }
}
