package repository

import (
	"context"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type serviceRepository struct {
	database   mongo.Database
	collection string
}

func NewServiceRepository(db mongo.Database, collection string) domain.serviceRepository {
	return &serviceRepository{
		database:   db,
		collection: collection,
	}
}

func (s *serviceRepository) FetchByBreedID(c context.Context, breedId string) ([]domain.Service, error) {
	collection := s.database.Collection(s.collection)

	var service domain.Service

	idHex, err := primitive.ObjectIDFromHex(breedId)
	if err != nil {
		return service, err
	}

	err = collection.FindOne(c, bson.M{"_id": idHex}).Decode(&service)
	return service, err
}
