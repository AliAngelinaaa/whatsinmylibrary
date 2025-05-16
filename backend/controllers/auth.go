package controllers

import (
	"booksite/config"
	"booksite/models"
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
	Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
	Endpoint:     google.Endpoint,
}

func GoogleCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
		return
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email     string `json:"email"`
		FullName  string `json:"name"`
	}
	json.NewDecoder(resp.Body).Decode(&userInfo)

	user := models.User{
		Email:    userInfo.Email,
		FullName: userInfo.FullName,
		Provider: "google",
	}
	config.DB.Where(models.User{Email: user.Email}).FirstOrCreate(&user)

	fmt.Fprintf(w, "Google login successful: %s", user.Email)
}
