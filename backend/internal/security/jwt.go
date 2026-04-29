package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Claims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Role    string `json:"role"`
	Expires int64  `json:"exp"`
}

type jwtHeader struct {
	Algorithm string `json:"alg"`
	Type      string `json:"typ"`
}

func SignToken(userID int64, email string, role string) (string, error) {
	header := jwtHeader{Algorithm: "HS256", Type: "JWT"}
	claims := Claims{
		Subject: strconv.FormatInt(userID, 10),
		Email:   email,
		Role:    role,
		Expires: time.Now().Add(24 * time.Hour).Unix(),
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	unsigned := base64.RawURLEncoding.EncodeToString(headerJSON) + "." + base64.RawURLEncoding.EncodeToString(claimsJSON)
	signature := sign(unsigned)
	return unsigned + "." + signature, nil
}

func VerifyToken(raw string) (*Claims, error) {
	token := strings.TrimSpace(raw)
	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimPrefix(token, "bearer ")

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token")
	}

	unsigned := parts[0] + "." + parts[1]
	expected := sign(unsigned)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return nil, errors.New("invalid token signature")
	}

	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, err
	}
	var header jwtHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, err
	}
	if header.Algorithm != "HS256" || header.Type != "JWT" {
		return nil, errors.New("unsupported token header")
	}

	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var claims Claims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, err
	}
	if claims.Subject == "" || claims.Email == "" || claims.Role == "" {
		return nil, errors.New("token is missing required claims")
	}
	if time.Now().Unix() >= claims.Expires {
		return nil, errors.New("token has expired")
	}

	return &claims, nil
}

func sign(unsigned string) string {
	mac := hmac.New(sha256.New, jwtSecret())
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-only-quiz-system-secret-change-me"
	}
	return []byte(fmt.Sprintf("quiz-system:%s", secret))
}
