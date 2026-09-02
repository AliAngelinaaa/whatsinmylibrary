package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig = &oauth2.Config{
	RedirectURL:  os.Getenv("GOOGLE_CALLBACK_URL"),
	ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
	ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	Scopes: []string{
		"https://www.googleapis.com/auth/userinfo.email",
		"https://www.googleapis.com/auth/userinfo.profile",
	},
	Endpoint: google.Endpoint,
}

func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	if googleOauthConfig.ClientID == "" {
		http.Error(w, `{"error":"Google OAuth is not configured"}`, http.StatusServiceUnavailable)
		return
	}
	url := googleOauthConfig.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func GoogleCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, `{"error":"failed to exchange token"}`, http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		http.Error(w, `{"error":"failed to build user info request"}`, http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, `{"error":"failed to get user info"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		http.Error(w, `{"error":"failed to decode user info"}`, http.StatusInternalServerError)
		return
	}

	user := models.User{
		Email:    userInfo.Email,
		FullName: userInfo.Name,
		Provider: "google",
	}
	config.DB.Where(models.User{Email: user.Email}).Attrs(models.User{
		FullName: user.FullName,
		Provider: user.Provider,
	}).FirstOrCreate(&user)

	jwtToken, err := middleware.SignToken(user.ID)
	if err != nil {
		http.Error(w, `{"error":"failed to sign token"}`, http.StatusInternalServerError)
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	http.Redirect(w, r, fmt.Sprintf("%s/auth/callback?token=%s", frontendURL, jwtToken), http.StatusTemporaryRedirect)
}

func DevLoginHandler(w http.ResponseWriter, r *http.Request) {
	if !config.DevAuthEnabled() {
		http.Error(w, `{"error":"dev auth disabled"}`, http.StatusForbidden)
		return
	}

	var body struct {
		Email    string `json:"email"`
		FullName string `json:"fullName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" {
		http.Error(w, `{"error":"email required"}`, http.StatusBadRequest)
		return
	}
	if body.FullName == "" {
		body.FullName = body.Email
	}

	user := models.User{
		Email:       body.Email,
		FullName:    body.FullName,
		Provider:    "dev",
		Coins:       50,
		AvatarColor: "#957DAD",
		ReaderTheme: "light",
	}
	config.DB.Where(models.User{Email: user.Email}).Attrs(models.User{
		FullName:    body.FullName,
		Provider:    "dev",
		Coins:       50,
		AvatarColor: "#957DAD",
		ReaderTheme: "light",
	}).FirstOrCreate(&user)

	jwtToken, err := middleware.SignToken(user.ID)
	if err != nil {
		http.Error(w, `{"error":"failed to sign token"}`, http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": jwtToken,
		"user":  userProfileResponse(user),
	})
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, userProfileResponse(user))
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}
