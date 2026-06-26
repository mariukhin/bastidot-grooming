package controller

import (
	"encoding/json"
	"net/http"
	"time"

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

func (oc *OrderController) BusySlots(w http.ResponseWriter, r *http.Request) {
	groomerId := r.URL.Query().Get("groomerId")
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	if groomerId == "" || fromStr == "" || toStr == "" {
		http.Error(w, jsonError("groomerId, from та to обов'язкові"), http.StatusBadRequest)
		return
	}

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		http.Error(w, jsonError("Невірний формат from, очікується YYYY-MM-DD"), http.StatusBadRequest)
		return
	}

	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		http.Error(w, jsonError("Невірний формат to, очікується YYYY-MM-DD"), http.StatusBadRequest)
		return
	}

	busySlots, err := oc.OrderUsecase.FetchBusySlots(r.Context(), groomerId, from, to)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(busySlots)
}
