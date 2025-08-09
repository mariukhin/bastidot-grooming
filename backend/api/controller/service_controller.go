package controller

import (
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type ServiceController struct {
	ServiceRepository domain.ServiceRepository
}

func (s *ServiceController) Fetch(w http.ResponseWriter, r *http.Request) {
	breedID := r.Context().Value("x-user-id").(string)

	services, err := s.ServiceRepository.FetchByBreedID(r.Context(), breedID)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(services)
}
