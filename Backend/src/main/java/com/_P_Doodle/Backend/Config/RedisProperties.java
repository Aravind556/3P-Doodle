package com._P_Doodle.Backend.Config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.redis")
public class RedisProperties {

    private boolean enabled = false;
    private String host = "localhost";
    private int port = 6379;
    private String password;
    private String channel = "whiteboard-events";
    private String roomChannel = "room-events";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getRoomChannel() {
        return roomChannel;
    }

    public void setRoomChannel(String roomChannel) {
        this.roomChannel = roomChannel;
    }
}
