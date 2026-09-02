package middleware

import (
	"backend/config"
	"backend/models"
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserContextKey contextKey = "user"

type Claims struct {
	UserID uint `json:"userId"`
	jwt.RegisteredClaims
}

func AuthRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := userFromRequest(r)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user, ok := userFromRequest(r); ok {
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

func UserFromContext(r *http.Request) (models.User, bool) {
	user, ok := r.Context().Value(UserContextKey).(models.User)
	return user, ok
}

func userFromRequest(r *http.Request) (models.User, bool) {
	tokenStr := tokenFromRequest(r)
	if tokenStr == "" {
		return models.User{}, false
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret()), nil
	})
	if err != nil || !token.Valid {
		return models.User{}, false
	}

	var user models.User
	if err := config.DB.First(&user, claims.UserID).Error; err != nil {
		return models.User{}, false
	}
	return user, true
}

func tokenFromRequest(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	if cookie, err := r.Cookie("token"); err == nil {
		return cookie.Value
	}
	return ""
}

func JWTSecret() []byte {
	return []byte(jwtSecret())
}

func jwtSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "dev-secret-change-me"
	}
	return secret
}

func SignToken(userID uint) (string, error) {
	claims := Claims{
		UserID: userID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret())
}
