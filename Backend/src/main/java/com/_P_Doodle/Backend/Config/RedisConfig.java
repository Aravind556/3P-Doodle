package com._P_Doodle.Backend.Config;

import com._P_Doodle.Backend.Service.RedisRoomStatusMessageSubscriber;
import com._P_Doodle.Backend.Service.RedisWhiteboardMessageSubscriber;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory(RedisProperties redisProperties) {
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration(
                redisProperties.getHost(), redisProperties.getPort());
        if (redisProperties.getPassword() != null && !redisProperties.getPassword().isBlank()) {
            configuration.setPassword(redisProperties.getPassword());
        }
        return new LettuceConnectionFactory(configuration);
    }

    // Both key and value serializers are StringRedisSerializer.
    // Publishers serialize their model objects to plain JSON strings (via ObjectMapper)
    // before calling convertAndSend, so the wire format is a clean UTF-8 JSON string.
    // This avoids GenericJackson2JsonRedisSerializer's @class metadata, which caused
    // MessageListenerAdapter to silently fail: it deserializes bytes → Object, then
    // cannot match that to handleMessage(DrawEvent) via reflection.
    @Bean
    public RedisTemplate<String, Object> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        return template;
    }

    @Bean
    public ChannelTopic whiteboardChannelTopic(RedisProperties redisProperties) {
        return new ChannelTopic(redisProperties.getChannel());
    }

    @Bean
    public ChannelTopic roomChannelTopic(RedisProperties redisProperties) {
        return new ChannelTopic(redisProperties.getRoomChannel());
    }

    // No custom serializer set on the adapters. The default StringRedisSerializer
    // delivers the raw JSON string to handleMessage(String json) in each subscriber,
    // where explicit ObjectMapper deserialization happens. This gives reliable,
    // type-safe dispatch without reflection-based method matching on Object payloads.
    @Bean
    public MessageListenerAdapter whiteboardRedisMessageListener(RedisWhiteboardMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "handleMessage");
    }

    @Bean
    public MessageListenerAdapter roomRedisMessageListener(RedisRoomStatusMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "handleMessage");
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            LettuceConnectionFactory connectionFactory,
            @Qualifier("whiteboardRedisMessageListener") MessageListenerAdapter whiteboardListener,
            @Qualifier("roomRedisMessageListener") MessageListenerAdapter roomListener,
            @Qualifier("whiteboardChannelTopic") ChannelTopic whiteboardTopic,
            @Qualifier("roomChannelTopic") ChannelTopic roomTopic) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(whiteboardListener, whiteboardTopic);
        container.addMessageListener(roomListener, roomTopic);
        return container;
    }
}
