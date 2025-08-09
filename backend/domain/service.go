package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionService = "service"
)

type Service struct {
	ID           primitive.ObjectID `bson:"_id" json:"id"`
	BreedId      primitive.ObjectID `bson:"breedId" json:"breedId"`
	Type         string `bson:"type" binding:"required" json:"type"`
    DefaultPrice int    `bson:"defaultPrice" binding:"required" json:"defaultPrice"`
    VipPrice     int    `bson:"vipPrice" binding:"required" json:"vipPrice"`
    DurationHour int    `bson:"durationHour" json:"durationHour"`
    DurationMin  int    `bson:"durationMin" json:"durationMin"`
}

type ServiceRepository interface {
	FetchByBreedID(c context.Context, breedID string) ([]Service, error)
}

