package main

import (
	"backend/config"
	"backend/routes"
	"backend/seed"
	"log"
	"net/http"
	"os"
)

func main() {
	config.InitEnv()
	config.ConnectDatabase()
	seed.Run()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := routes.SetupRouter()
	log.Printf("Server running at http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
