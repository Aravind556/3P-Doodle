package com._P_Doodle.Backend.Service;

import com._P_Doodle.Backend.Model.DrawEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisWhiteboardRealtimeBroadcaster implements WhiteboardRealtimeBroadcaster {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ChannelTopic whiteboardChannelTopic;
    private final ObjectMapper objectMapper;

    public RedisWhiteboardRealtimeBroadcaster(
            RedisTemplate<String, Object> redisTemplate,
            @Qualifier("whiteboardChannelTopic") ChannelTopic whiteboardChannelTopic,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.whiteboardChannelTopic = whiteboardChannelTopic;
        this.objectMapper = objectMapper;
    }

    @Override
    public void broadcast(DrawEvent event) {
        try {
            // Serialize to plain JSON string so the wire format is clean UTF-8 JSON.
            // The MessageListenerAdapter's default StringRedisSerializer then passes
            // this string directly to RedisWhiteboardMessageSubscriber.handleMessage(String).
            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(whiteboardChannelTopic.getTopic(), json);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize DrawEvent for Redis pub/sub", e);
        }
    }
}
