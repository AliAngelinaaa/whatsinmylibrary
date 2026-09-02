package main

import (
	"backend/config"
	"backend/routes"
	"backend/seed"
	"log"
	"net/http"
)

func main() {
	config.InitEnv()
	config.ConnectDatabase()
	seed.Run()

	router := routes.SetupRouter()
	log.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
