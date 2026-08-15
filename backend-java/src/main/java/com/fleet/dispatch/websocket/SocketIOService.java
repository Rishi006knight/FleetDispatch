package com.fleet.dispatch.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SocketIOService {
    private static final Logger logger = LoggerFactory.getLogger(SocketIOService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<String>> roomMembers = new ConcurrentHashMap<>();
    private final Map<String, List<String>> pollingQueues = new ConcurrentHashMap<>();

    public void registerSession(WebSocketSession session) {
        sessions.put(session.getId(), session);
        logger.info("WebSocket client connected: {}", session.getId());
    }

    public void removeSession(WebSocketSession session) {
        sessions.remove(session.getId());
        for (List<String> members : roomMembers.values()) {
            members.remove(session.getId());
        }
        logger.info("WebSocket client disconnected: {}", session.getId());
    }

    public void joinRoom(String sessionId, String room) {
        roomMembers.computeIfAbsent(room, k -> new CopyOnWriteArrayList<>()).add(sessionId);
        logger.info("Session {} joined room: {}", sessionId, room);
    }

    public void emit(String eventName, Object payload) {
        try {
            List<Object> packet = Arrays.asList(eventName, payload);
            String jsonPayload = objectMapper.writeValueAsString(packet);
            String socketIOMessage = "42" + jsonPayload;

            TextMessage textMessage = new TextMessage(socketIOMessage);

            // Broadcast to all active WebSocket sessions
            for (WebSocketSession session : sessions.values()) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                    } catch (IOException e) {
                        logger.error("Failed to send WebSocket message to {}: {}", session.getId(), e.getMessage());
                    }
                }
            }

            // Also push to HTTP polling queues
            for (List<String> queue : pollingQueues.values()) {
                synchronized (queue) {
                    queue.add(socketIOMessage);
                }
            }

        } catch (Exception e) {
            logger.error("Error serializing socket event {}: {}", eventName, e.getMessage());
        }
    }

    public void queuePollingMessage(String sid, String message) {
        List<String> queue = pollingQueues.computeIfAbsent(sid, k -> Collections.synchronizedList(new ArrayList<>()));
        queue.add(message);
    }

    public List<String> drainPollingMessages(String sid) {
        List<String> queue = pollingQueues.computeIfAbsent(sid, k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (queue) {
            List<String> messages = new ArrayList<>(queue);
            queue.clear();
            return messages;
        }
    }
}
