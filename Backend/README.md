# Spring Boot OAuth2 + JWT Authentication Example

This project demonstrates how to implement OAuth2 login (e.g., Google), JWT-based authentication, and refresh token support in a Spring Boot backend. It enables persistent login, secure API access, and stateless authentication.

## Features
- OAuth2 login with providers like Google
- JWT access tokens with claims (userId, email, roles)
- Short-lived access tokens (default: 15 minutes)
- Refresh tokens for persistent login (stored securely, e.g., as HTTP-only cookies)
- User and RefreshToken entities with JPA
- Stateless authentication for REST APIs
- Token validation and expiration checks

## Project Structure
```
Backend/
  src/main/java/com/_P_Doodle/Backend/
    Model/
      User.java
      RefreshToken.java
    Repository/
      UserRepository.java
      RefreshTokenRepository.java
    Security/
      JwtUtil.java
      CustomOAuth2UserService.java
      OAuth2SuccessHandler.java
      SecurityConfig.java
    Controller/
      AuthController.java
  src/main/resources/
    application.properties
```

## How It Works
1. **User logs in via OAuth2**
   - Spring Security handles the OAuth2 flow.
   - On success, user info is saved/updated in the database.

2. **JWT and Refresh Token Generation**
   - Backend generates a short-lived JWT access token and a long-lived refresh token.
   - Access token is sent to the frontend (e.g., in a header or response body).
   - Refresh token is sent as an HTTP-only, Secure cookie.

3. **API Requests**
   - Frontend sends the access token in the Authorization header for API calls.
   - Backend validates the JWT and processes the request.

4. **Token Refresh**
   - When the access token expires, the frontend calls `/auth/refresh`.
   - Backend validates the refresh token and issues a new access token.

5. **Logout**
   - Frontend calls `/auth/logout`.
   - Backend deletes the refresh token and clears the cookie.

## Key Classes
- **JwtUtil**: Handles JWT creation, validation, and claim extraction.
- **User**: Entity for storing user details.
- **RefreshToken**: Entity for storing refresh tokens.
- **UserRepository / RefreshTokenRepository**: JPA repositories for persistence.
- **CustomOAuth2UserService**: Loads user info from OAuth2 provider and saves to DB.
- **OAuth2SuccessHandler**: Generates tokens and sets cookies after successful login.
- **SecurityConfig**: Configures Spring Security for OAuth2 and JWT.
- **AuthController**: Endpoints for refreshing tokens and logout.

## Configuration
Edit `src/main/resources/application.properties`:
```
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_CLIENT_SECRET
spring.security.oauth2.client.registration.google.scope=openid,profile,email
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
# JWT secret (base64-encoded) and expiration (ms)
jwt.secret=your_jwt_secret
jwt.expiration=900000
```

## Security Notes
- Use a strong, random, base64-encoded secret for `jwt.secret`.
- Store refresh tokens securely (HTTP-only, Secure cookies).
- Set appropriate expiration times for access and refresh tokens.
- Always validate and sanitize user input.

## Running the Project
1. Configure your OAuth2 provider credentials in `application.properties`.
2. Build and run the Spring Boot application:
   ```sh
   ./mvnw spring-boot:run
   ```
3. Access the app and test login, API access, token refresh, and logout.

## License
MIT
