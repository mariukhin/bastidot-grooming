package domain

import (
	"context"
	"time"
)

// OrderRequest is the payload for creating a booking. The client and pet are
// resolved (found-or-created) by the usecase — the caller only supplies raw
// identifying data, not IDs. The groomer is expected to already exist and is
// only linked, never created.
type OrderRequest struct {
	ClientName      string    `json:"clientName" binding:"required"`
	ClientPhone     string    `json:"clientPhone" binding:"required"`
	ClientEmail     string    `json:"clientEmail"`
	PetName         string    `json:"petName" binding:"required"`
	PetAge          int       `json:"petAge"`
	PetWeight       float64   `json:"petWeight"`
	PetPhotoUrl     string    `json:"petPhotoUrl"`
	PetComment      string    `json:"petComment"`
	GroomerID       string    `json:"groomerId" binding:"required"`
	ScheduledAt     time.Time `json:"scheduledAt" binding:"required"`
	DurationMinutes int       `json:"durationMinutes" binding:"required"`
	Comment         string    `json:"comment"`
	ServiceIDs      []string  `json:"serviceIds"`
}

type OrderUsecase interface {
	CreateOrder(c context.Context, request *OrderRequest) (*Order, error)
	// FetchBusySlots returns the groomer's busy intervals covering every
	// calendar day in [from, to] inclusive, so the frontend can fetch once
	// per visible week instead of once per day.
	FetchBusySlots(c context.Context, groomerId string, from, to time.Time) ([]BusySlot, error)
}
