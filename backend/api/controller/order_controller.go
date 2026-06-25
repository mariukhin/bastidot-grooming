package controller

import (
	"encoding/json"
	"net/http"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type OrderController struct {
	OrderUsecase domain.OrderUsecase
}

func (oc *OrderController) Create(w http.ResponseWriter, r *http.Request) {
	var request domain.OrderRequest

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusBadRequest)
		return
	}

	if request.ClientName == "" || request.ClientPhone == "" {
		http.Error(w, jsonError("Ім'я та телефон клієнта обов'язкові"), http.StatusBadRequest)
		return
	}

	if request.PetName == "" {
		http.Error(w, jsonError("Ім'я улюбленця обов'язкове"), http.StatusBadRequest)
		return
	}

	if request.GroomerID == "" {
		http.Error(w, jsonError("Грумер обов'язковий"), http.StatusBadRequest)
		return
	}

	if request.ScheduledAt.IsZero() {
		http.Error(w, jsonError("Дата та час візиту обов'язкові"), http.StatusBadRequest)
		return
	}

	order, err := oc.OrderUsecase.CreateOrder(r.Context(), &request)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(order)
}
