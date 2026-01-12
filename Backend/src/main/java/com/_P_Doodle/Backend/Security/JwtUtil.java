package com._P_Doodle.Backend.Security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.util.Date;
import java.util.List;
import java.util.function.Function;

import javax.crypto.SecretKey;

@Component
public class JwtUtil {
    private final String jwtSecret = "your_jwt_secret";
    private final long jwtExpirationMs = 900_000; // 15 minutes

    public String generateToken(String userId, String email, List<String> roles) {
        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSignInKey())
                .compact();
    }
    public Claims ExtractallClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }    


    //Single claim extraction
    private <T> T ExtractClaim(String token , Function<Claims,T> claimsResolver) {
        final Claims claims = ExtractallClaims(token);
        return claimsResolver.apply(claims);
    }

    //Extracts username from the token
    public String ExtractUsername(String token){
        return ExtractClaim(token,Claims::getSubject);
    }

     private SecretKey getSignInKey() {
        byte[] keyBytes=Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

//Checking if token is expired
    private boolean isTokenExpired(String token){
        return extractExpiration(token).before(new Date());
    }

    //Extracting expiration date from token
    //Need to switch to Instant for better time handling and readablility 
    private Date extractExpiration(String token) {
        return ExtractClaim(token,Claims::getExpiration);
    }

    public boolean isTokenValid(String token, UserDetails userDetails){
        final String username = ExtractUsername(token);
        return (username.equals(userDetails.getUsername()) &&!isTokenExpired(token));
    }
}