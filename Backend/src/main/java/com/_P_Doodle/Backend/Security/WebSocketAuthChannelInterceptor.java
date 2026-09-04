package com._P_Doodle.Backend.Security;

import com._P_Doodle.Backend.Service.WhiteboardStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor.class);

    // Matches /topic/draw/{roomCode} and /topic/room/{roomCode}
    private static final Pattern ROOM_TOPIC_PATTERN = Pattern.compile("^/topic/(?:draw|room)/([A-Za-z0-9]+)$");

    private final JwtDecoder jwtDecoder;
    private final WhiteboardStateService whiteboardStateService;

    public WebSocketAuthChannelInterceptor(JwtDecoder jwtDecoder, WhiteboardStateService whiteboardStateService) {
        this.jwtDecoder = jwtDecoder;
        this.whiteboardStateService = whiteboardStateService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }

        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String token = resolveBearerToken(accessor);
        if (token == null || token.isBlank()) {
            log.warn("authenticateConnect: missing bearer token for session {}", accessor.getSessionId());
            throw new IllegalArgumentException("Missing Authorization bearer token for WebSocket connection");
        }

        Jwt jwt = jwtDecoder.decode(token);
        Principal principal = new StompPrincipal(jwt.getSubject());
        accessor.setUser(principal);

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("jwt", jwt);
        }
        log.info("authenticateConnect: successfully authenticated user {} for session {}", principal.getName(), accessor.getSessionId());
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Matcher matcher = ROOM_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            // Not a room-scoped topic; nothing to authorize here.
            return;
        }

        String roomCode = matcher.group(1);
        Principal user = accessor.getUser();
        if (user == null || user.getName() == null || user.getName().isBlank()) {
            log.warn("authorizeSubscription: unauthenticated subscription attempt to {}", destination);
            throw new IllegalArgumentException("Unauthenticated subscription attempt to " + destination);
        }

        boolean authorized;
        try {
            authorized = whiteboardStateService.userBelongsToRoom(roomCode, user.getName());
        } catch (IllegalArgumentException e) {
            // Malformed user id or room lookup failure - treat as unauthorized.
            log.warn("authorizeSubscription: exception verifying user {} in room {}: {}", user.getName(), roomCode, e.getMessage());
            authorized = false;
        }

        if (!authorized) {
            log.warn("authorizeSubscription: user {} is NOT authorized for room topic {}", user.getName(), destination);
            throw new IllegalArgumentException("User is not authorized to subscribe to room " + roomCode);
        }
        log.info("authorizeSubscription: user {} authorized for subscription to {}", user.getName(), destination);
    }

    private String resolveBearerToken(StompHeaderAccessor accessor) {
        List<String> values = accessor.getNativeHeader("Authorization");
        if (values == null || values.isEmpty()) {
            return null;
        }

        String header = values.get(0);
        if (header == null) {
            return null;
        }

        if (header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return header.substring(7);
        }

        return null;
    }
}
