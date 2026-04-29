package current

import (
	"quizsystem/internal/apierr"
	"quizsystem/internal/model"

	encoreauth "encore.dev/beta/auth"
)

func User() (*model.AuthData, error) {
	data, ok := encoreauth.Data().(*model.AuthData)
	if !ok || data == nil {
		return nil, apierr.Unauthenticated("authentication is required")
	}
	return data, nil
}

func RequireRole(role string) (*model.AuthData, error) {
	user, err := User()
	if err != nil {
		return nil, err
	}
	if user.Role != role {
		return nil, apierr.PermissionDenied("insufficient permissions")
	}
	return user, nil
}
