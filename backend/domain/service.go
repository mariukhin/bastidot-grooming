package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionTask = "service"
)

type Service struct {
	ID           primitive.ObjectID `bson:"_id" json:"id"`
	Type         string `bson:"type" binding:"required" json:"type"`
    DefaultPrice number `bson:"defaultPrice" binding:"required" json:"defaultPrice"`
    VipPrice     number `bson:"vipPrice" binding:"required" json:"vipPrice"`
    DurationHour number `bson:"durationHour" json:"durationHour"`
    DurationMin  number `bson:"durationMin" json:"durationMin"`
}

type ServiceRepository interface {
	Create(c context.Context, service *Service) error
	FetchByBreedID(c context.Context, userID string) ([]Service, error)
}

