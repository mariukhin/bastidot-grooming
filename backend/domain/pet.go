package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)


type Pet struct {
	ID          primitive.ObjectID `bson:"_id"`
	Name        string             `bson:"name" json:"name"`
    Age         int                `bson:"age" json:"age"`
    Character   string             `bson:"character" json:"character"`
    UserID      primitive.ObjectID `bson:"user_id" json:"user_id"`
}

type PetRepository interface {
	Create(c context.Context, pet *Pet) error
	Fetch(c context.Context) ([]Pet, error)
	GetByUserID(c context.Context, userId string) (Pet, error)
	GetByID(c context.Context, id string) (Pet, error)
}
