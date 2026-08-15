package com.fleet.dispatch.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
public class SocketIOPollingController {

    @Autowired
    private SocketIOService socketIOService;

    @GetMapping(value = "/socket.io/", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> handleSocketIOPollingGet(
            @RequestParam(value = "EIO", defaultValue = "4") String eio,
            @RequestParam(value = "transport", defaultValue = "polling") String transport,
            @RequestParam(value = "sid", required = false) String sid) {

        if (sid == null || sid.isEmpty()) {
            // New connection handshake
            String newSid = UUID.randomUUID().toString();
            String handshake = "0{\"sid\":\"" + newSid + "\",\"upgrades\":[\"websocket\"],\"pingInterval\":25000,\"pingTimeout\":20000,\"maxPayload\":1000000}";
            return ResponseEntity.ok(handshake);
        }

        // Return queued messages or empty packet
        List<String> messages = socketIOService.drainPollingMessages(sid);
        if (messages.isEmpty()) {
            return ResponseEntity.ok("6"); // Noop or ok
        }
        return ResponseEntity.ok(String.join("\n", messages));
    }

    @PostMapping(value = "/socket.io/", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> handleSocketIOPollingPost(
            @RequestParam(value = "sid", required = false) String sid,
            @RequestBody(required = false) String body) {
        return ResponseEntity.ok("ok");
    }
}
