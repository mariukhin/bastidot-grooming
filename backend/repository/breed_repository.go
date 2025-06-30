package repository

import (
	"context"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type breedRepository struct {
	database   mongo.Database
	collection string
}

func NewBreedRepository(db mongo.Database, collection string) domain.BreedRepository {
	return &breedRepository{
		database:   db,
		collection: collection,
	}
}

func (br *breedRepository) Create(c context.Context, breed *domain.Breed) error {
	collection := br.database.Collection(br.collection)

	_, err := collection.InsertOne(c, breed)

	return err
}

func (br *breedRepository) Fetch(c context.Context) ([]domain.Breed, error) {
	collection := br.database.Collection(br.collection)

	cursor, err := collection.Find(c, bson.D{})

	if err != nil {
		return nil, err
	}

	var breeds []domain.Breed

	err = cursor.All(c, &breeds)
	if breeds == nil {
		return []domain.Breed{}, err
	}

	return breeds, err
}


func (br *breedRepository) GetByID(c context.Context, id string) (domain.Breed, error) {
	collection := br.database.Collection(br.collection)

	var breed domain.Breed

	idHex, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return breed, err
	}

	err = collection.FindOne(c, bson.M{"_id": idHex}).Decode(&breed)
	return breed, err
}
