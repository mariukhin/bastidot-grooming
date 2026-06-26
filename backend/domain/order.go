package domain

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionOrder = "order"
)

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusCompleted OrderStatus = "completed"
	OrderStatusCancelled OrderStatus = "cancelled"
	OrderStatusNoShow    OrderStatus = "no_show"
)

// OrderStatusChange records a single transition in an order's lifecycle, so
// the full history (who changed it, when, from what to what) is preserved
// instead of being overwritten by the next status update.
type OrderStatusChange struct {
	Status    OrderStatus        `bson:"status" json:"status"`
	ChangedAt time.Time          `bson:"changedAt" json:"changedAt"`
	ChangedBy primitive.ObjectID `bson:"changedBy,omitempty" json:"changedBy,omitempty"`
}

type Order struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	ClientID    primitive.ObjectID `bson:"clientId" json:"clientId"`
	PetID       primitive.ObjectID `bson:"petId" json:"petId"`
	GroomerID   primitive.ObjectID `bson:"groomerId" json:"groomerId"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	ScheduledAt time.Time          `bson:"scheduledAt" json:"scheduledAt"`
	// DurationMinutes is captured at booking time from the selected services'
	// total duration, so a later price/duration change on the service never
	// retroactively shifts an already-booked slot.
	DurationMinutes int                  `bson:"durationMinutes" json:"durationMinutes"`
	Status          OrderStatus          `bson:"status" json:"status"`
	StatusHistory   []OrderStatusChange  `bson:"statusHistory" json:"statusHistory"`
	Comment         string               `bson:"comment" json:"comment"`
	ServiceIDs      []primitive.ObjectID `bson:"serviceIds" json:"serviceIds"`
}

// BusySlot is the public shape of an already-booked interval for a groomer,
// used by the frontend to exclude overlapping time slots from the picker.
type BusySlot struct {
	ScheduledAt     time.Time `json:"scheduledAt"`
	DurationMinutes int       `json:"durationMinutes"`
}

type OrderRepository interface {
	Create(c context.Context, order *Order) error
	Fetch(c context.Context) ([]Order, error)
	FetchByClientID(c context.Context, clientId string) ([]Order, error)
	FetchByGroomerID(c context.Context, groomerId string) ([]Order, error)
	// FetchByGroomerAndDateRange returns the groomer's non-cancelled orders
	// whose scheduledAt falls within [rangeStart, rangeEnd).
	FetchByGroomerAndDateRange(c context.Context, groomerId string, rangeStart, rangeEnd time.Time) ([]Order, error)
	GetByID(c context.Context, id string) (Order, error)
	UpdateStatus(c context.Context, id string, status OrderStatus, changedBy primitive.ObjectID) error
	CountCompletedByPetID(c context.Context, petId string) (int64, error)
}
