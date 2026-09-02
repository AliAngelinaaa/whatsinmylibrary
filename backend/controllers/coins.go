package controllers

import (
	"backend/config"
	"backend/middleware"
	"encoding/json"
	"net/http"
)

type coinPack struct {
	ID    string  `json:"id"`
	Coins int     `json:"coins"`
	Price float64 `json:"price"`
	Label string  `json:"label"`
	Bonus int     `json:"bonus"`
}

var coinPacks = []coinPack{
	{ID: "pack_10", Coins: 10, Price: 0.99, Label: "Starter", Bonus: 0},
	{ID: "pack_50", Coins: 50, Price: 3.99, Label: "Reader", Bonus: 5},
	{ID: "pack_120", Coins: 120, Price: 7.99, Label: "Bookworm", Bonus: 20},
}

func ListCoinPacksHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, coinPacks)
}

func PurchaseCoinsHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		PackID string `json:"packId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	var selected *coinPack
	for i := range coinPacks {
		if coinPacks[i].ID == body.PackID {
			selected = &coinPacks[i]
			break
		}
	}
	if selected == nil {
		http.Error(w, `{"error":"invalid pack"}`, http.StatusBadRequest)
		return
	}

	totalCoins := selected.Coins + selected.Bonus
	config.DB.Model(&user).Update("coins", user.Coins+totalCoins)
	config.DB.First(&user, user.ID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":      "coins purchased",
		"coinsAdded":   totalCoins,
		"coins":        user.Coins,
		"pack":         selected,
		"paymentNote":  "Mock payment — wire up Stripe or PayPal for production",
	})
}
