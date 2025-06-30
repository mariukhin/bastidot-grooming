package controller

import (
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type BreedController struct {
	BreedRepository domain.BreedRepository
}

func (br *BreedController) Create(w http.ResponseWriter, r *http.Request) {
    var breed domain.Breed

    err := json.NewDecoder(r.Body).Decode(&breed)
    if err != nil {
       http.Error(w, jsonError(err.Error()), http.StatusBadRequest)
       return
    }
    breed.ID = primitive.NewObjectID()

    err = br.BreedRepository.Create(r.Context(), &breed)
    if err != nil {
       http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
       return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(domain.SuccessResponse{
       Message: "Breed created successfully",
    })
}



func (br *BreedController) Fetch(w http.ResponseWriter, r *http.Request) {
	breeds, err := br.BreedRepository.Fetch(r.Context())
    if err != nil {
    	http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
    	return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(breeds)
}
