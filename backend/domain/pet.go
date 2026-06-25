package domain

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionPet = "pet"
)

type Pet struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Age       int                `bson:"age" json:"age"`
	Weight    float64            `bson:"weight" json:"weight"`
	PhotoUrl  string             `bson:"photoUrl" json:"photoUrl"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	Comment   string             `bson:"comment" json:"comment"`
}

// VisitsCount is not stored on the pet itself — it is derived by counting
// completed orders for the pet (see OrderRepository.CountCompletedByPetID),
// so it can never drift out of sync with the actual order history.

type PetRepository interface {
	Create(c context.Context, pet *Pet) error
	Fetch(c context.Context) ([]Pet, error)
	FetchByUserID(c context.Context, userId string) ([]Pet, error)
	GetByID(c context.Context, id string) (Pet, error)
	GetByUserIDAndName(c context.Context, userId string, name string) (Pet, error)
}
