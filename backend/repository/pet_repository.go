package repository

import (
	"context"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type petRepository struct {
	database   mongo.Database
	collection string
}

func NewPetRepository(db mongo.Database, collection string) domain.PetRepository {
	return &petRepository{
		database:   db,
		collection: collection,
	}
}

func (pr *petRepository) Create(c context.Context, pet *domain.Pet) error {
	collection := pr.database.Collection(pr.collection)

	_, err := collection.InsertOne(c, pet)

	return err
}

func (pr *petRepository) Fetch(c context.Context) ([]domain.Pet, error) {
	collection := pr.database.Collection(pr.collection)

	cursor, err := collection.Find(c, bson.D{})
	if err != nil {
		return nil, err
	}

	var pets []domain.Pet

	err = cursor.All(c, &pets)
	if pets == nil {
		return []domain.Pet{}, err
	}

	return pets, err
}

func (pr *petRepository) FetchByUserID(c context.Context, userId string) ([]domain.Pet, error) {
	collection := pr.database.Collection(pr.collection)

	var pets []domain.Pet

	idHex, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return pets, err
	}

	cursor, err := collection.Find(c, bson.M{"userId": idHex})
	if err != nil {
		return nil, err
	}

	err = cursor.All(c, &pets)
	if pets == nil {
		return []domain.Pet{}, err
	}

	return pets, err
}

func (pr *petRepository) GetByID(c context.Context, id string) (domain.Pet, error) {
	collection := pr.database.Collection(pr.collection)

	var pet domain.Pet

	idHex, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return pet, err
	}

	err = collection.FindOne(c, bson.M{"_id": idHex}).Decode(&pet)
	return pet, err
}

func (pr *petRepository) GetByUserIDAndName(c context.Context, userId string, name string) (domain.Pet, error) {
	collection := pr.database.Collection(pr.collection)

	var pet domain.Pet

	idHex, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return pet, err
	}

	err = collection.FindOne(c, bson.M{"userId": idHex, "name": name}).Decode(&pet)
	return pet, err
}
