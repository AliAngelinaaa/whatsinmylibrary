package main

import (
	"booksite/config"
	"booksite/routes"
	"log"
	"net/http"
)

func main() {
	config.InitEnv()
	config.ConnectDatabase()
	router := routes.SetupRouter()
	log.Println("Server running at http://localhost:8080")
	http.ListenAndServe(":8080", router)
}