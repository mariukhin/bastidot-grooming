package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionBreed = "breed"
)

type Breed struct {
	ID       primitive.ObjectID `bson:"_id"`
	Name     string             `bson:"name"`
}

type BreedRepository interface {
	Create(c context.Context, breed *Breed) error
	Fetch(c context.Context) ([]Breed, error)
	GetByID(c context.Context, id string) (Breed, error)
}
