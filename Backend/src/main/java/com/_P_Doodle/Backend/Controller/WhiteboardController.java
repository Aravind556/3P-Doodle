package com._P_Doodle.Backend.Controller;

import com._P_Doodle.Backend.Model.WhiteboardStateResponse;
import com._P_Doodle.Backend.Service.WhiteboardStateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/whiteboard")
@CrossOrigin(origins = "*")
public class WhiteboardController {

    private final WhiteboardStateService whiteboardStateService;

    public WhiteboardController(WhiteboardStateService whiteboardStateService) {
        this.whiteboardStateService = whiteboardStateService;
    }

    @GetMapping("/state")
    public ResponseEntity<?> getState(@RequestParam String roomCode, @AuthenticationPrincipal Jwt jwt) {
        try {
            WhiteboardStateResponse response = whiteboardStateService.getState(roomCode, jwt.getSubject());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
