package bootstrap

import (
	"context"
	"log"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	appmongo "github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureIndexes creates the indexes required for data integrity and query
// performance. It is safe to call on every startup — MongoDB is a no-op
// when an identical index already exists.
func EnsureIndexes(db appmongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "phoneNumber", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	}

	orderIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "groomerId", Value: 1}, {Key: "scheduledAt", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "clientId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "petId", Value: 1}, {Key: "status", Value: 1}},
		},
	}

	petIndexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "userId", Value: 1}},
		},
	}

	if err := db.Collection(domain.CollectionUser).EnsureIndexes(ctx, userIndexes); err != nil {
		log.Printf("failed to ensure user indexes: %v", err)
	}

	if err := db.Collection(domain.CollectionOrder).EnsureIndexes(ctx, orderIndexes); err != nil {
		log.Printf("failed to ensure order indexes: %v", err)
	}

	if err := db.Collection(domain.CollectionPet).EnsureIndexes(ctx, petIndexes); err != nil {
		log.Printf("failed to ensure pet indexes: %v", err)
	}
}
