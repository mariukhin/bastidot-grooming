package controller

import (
	"encoding/json"
	"net/http"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type GroomerController struct {
	GroomerUsecase domain.GroomerUsecase
}

func (gc *GroomerController) Fetch(w http.ResponseWriter, r *http.Request) {
	groomers, err := gc.GroomerUsecase.FetchGroomers(r.Context())
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(groomers)
}
