package com.fleet.dispatch.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

@Component
public class SocketIOWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(SocketIOWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private SocketIOService socketIOService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        socketIOService.registerSession(session);

        // Send Engine.IO / Socket.IO handshake open packet
        String handshake = "0{\"sid\":\"" + session.getId() + "\",\"upgrades\":[],\"pingInterval\":25000,\"pingTimeout\":20000,\"maxPayload\":1000000}";
        session.sendMessage(new TextMessage(handshake));

        // Send Socket.IO connect confirmation packet
        session.sendMessage(new TextMessage("40{\"sid\":\"" + session.getId() + "\"}"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();

        // Heartbeat Ping (Engine.IO '2' -> Pong '3')
        if ("2".equals(payload) || payload.startsWith("2probe")) {
            session.sendMessage(new TextMessage(payload.startsWith("2probe") ? "3probe" : "3"));
            return;
        }

        // Socket.IO Connect request
        if (payload.startsWith("40")) {
            session.sendMessage(new TextMessage("40{\"sid\":\"" + session.getId() + "\"}"));
            return;
        }

        // Socket.IO Event (e.g. 42["join_room", "admin"])
        if (payload.startsWith("42")) {
            try {
                String jsonPart = payload.substring(2);
                JsonNode array = objectMapper.readTree(jsonPart);
                if (array.isArray() && array.size() >= 2) {
                    String event = array.get(0).asText();
                    if ("join_room".equals(event)) {
                        String room = array.get(1).asText();
                        socketIOService.joinRoom(session.getId(), room);
                    }
                }
            } catch (Exception e) {
                logger.warn("Error parsing Socket.IO message from client: {}", e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        socketIOService.removeSession(session);
    }
}
