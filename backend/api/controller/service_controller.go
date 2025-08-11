package controller

import (
	"encoding/json"
	"net/http"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type ServiceController struct {
	ServiceRepository domain.ServiceRepository
}

type BreedRequest struct {
	BreedID string `json:"breedId"`
}

func (s *ServiceController) Fetch(w http.ResponseWriter, r *http.Request) {
    var requestData BreedRequest

    err := json.NewDecoder(r.Body).Decode(&requestData)
    if err != nil {
    	http.Error(w, "Invalid JSON format", http.StatusBadRequest)
    	return
    }

    breedID := requestData.BreedID

    if breedID == "" {
    	http.Error(w, "breedId is required", http.StatusBadRequest)
    	return
    }

	services, err := s.ServiceRepository.FetchByBreedID(r.Context(), breedID)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(services)
}
