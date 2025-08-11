package repository

import (
	"context"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type serviceRepository struct {
	database   mongo.Database
	collection string
}

func NewServiceRepository(db mongo.Database, collection string) domain.ServiceRepository {
	return &serviceRepository{
		database:   db,
		collection: collection,
	}
}

func (s *serviceRepository) FetchByBreedID(c context.Context, breedId string) ([]domain.Service, error) {
	collection := s.database.Collection(s.collection)

	var services []domain.Service

	idHex, err := primitive.ObjectIDFromHex(breedId)
	if err != nil {
    	return services, err
    }

    filter := bson.M{"breedId": idHex}


    findOptions := options.Find()
    findOptions.SetSort(bson.D{{"defaultPrice", 1}})

    cursor, err := collection.Find(c, filter, findOptions)
    if err != nil {
    	return nil, err
    }

	err = cursor.All(c, &services)
	defer cursor.Close(c)
	if services == nil {
		return []domain.Service{}, err
	}

	return services, err
}
