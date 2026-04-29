package auth

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"quizsystem/internal/apierr"
	"quizsystem/internal/model"
	"quizsystem/internal/security"
	"quizsystem/internal/store"

	encoreauth "encore.dev/beta/auth"
	"encore.dev/storage/sqldb"
)

//encore:authhandler
func AuthHandler(ctx context.Context, token string) (encoreauth.UID, *model.AuthData, error) {
	claims, err := security.VerifyToken(token)
	if err != nil {
		return "", nil, apierr.Unauthenticated("invalid authentication token")
	}
	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		return "", nil, apierr.Unauthenticated("invalid authentication token")
	}

	var user model.AuthData
	err = store.DB.QueryRow(ctx, `
		SELECT id, email, role
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		return "", nil, apierr.Unauthenticated("invalid authentication token")
	}

	return encoreauth.UID(claims.Subject), &user, nil
}

//encore:api public method=POST path=/auth/register
func Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	role := strings.ToLower(strings.TrimSpace(req.Role))

	if email == "" || !strings.Contains(email, "@") {
		return nil, apierr.Invalid("a valid email is required")
	}
	if len(req.Password) < 8 {
		return nil, apierr.Invalid("password must be at least 8 characters")
	}
	if role != "admin" && role != "user" {
		return nil, apierr.Invalid("role must be admin or user")
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, apierr.Internal("could not hash password", err)
	}

	var user AuthUser
	err = store.DB.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, role)
		VALUES ($1, $2, $3)
		RETURNING id, email, role
	`, email, hash, role).Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, apierr.AlreadyExists("email is already registered")
		}
		return nil, apierr.Internal("could not create user", err)
	}

	token, err := security.SignToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, apierr.Internal("could not sign token", err)
	}

	return &AuthResponse{Token: token, User: user}, nil
}

//encore:api public method=POST path=/auth/login
func Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		return nil, apierr.Invalid("email and password are required")
	}

	var user AuthUser
	var hash string
	err := store.DB.QueryRow(ctx, `
		SELECT id, email, role, password_hash
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.Role, &hash)
	if err != nil {
		if errors.Is(err, sqldb.ErrNoRows) {
			return nil, apierr.Unauthenticated("invalid email or password")
		}
		return nil, apierr.Internal("could not load user", err)
	}

	if !security.VerifyPassword(req.Password, hash) {
		return nil, apierr.Unauthenticated("invalid email or password")
	}

	token, err := security.SignToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, apierr.Internal("could not sign token", err)
	}

	return &AuthResponse{Token: token, User: user}, nil
}
