package repository

import (
	"context"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type orderRepository struct {
	database   mongo.Database
	collection string
}

func NewOrderRepository(db mongo.Database, collection string) domain.OrderRepository {
	return &orderRepository{
		database:   db,
		collection: collection,
	}
}

func (or *orderRepository) Create(c context.Context, order *domain.Order) error {
	collection := or.database.Collection(or.collection)

	if len(order.StatusHistory) == 0 {
		order.StatusHistory = []domain.OrderStatusChange{
			{Status: order.Status, ChangedAt: order.CreatedAt},
		}
	}

	_, err := collection.InsertOne(c, order)

	return err
}

func (or *orderRepository) Fetch(c context.Context) ([]domain.Order, error) {
	collection := or.database.Collection(or.collection)

	cursor, err := collection.Find(c, bson.D{})
	if err != nil {
		return nil, err
	}

	var orders []domain.Order

	err = cursor.All(c, &orders)
	if orders == nil {
		return []domain.Order{}, err
	}

	return orders, err
}

func (or *orderRepository) FetchByClientID(c context.Context, clientId string) ([]domain.Order, error) {
	collection := or.database.Collection(or.collection)

	var orders []domain.Order

	idHex, err := primitive.ObjectIDFromHex(clientId)
	if err != nil {
		return orders, err
	}

	cursor, err := collection.Find(c, bson.M{"clientId": idHex})
	if err != nil {
		return nil, err
	}

	err = cursor.All(c, &orders)
	if orders == nil {
		return []domain.Order{}, err
	}

	return orders, err
}

func (or *orderRepository) FetchByGroomerID(c context.Context, groomerId string) ([]domain.Order, error) {
	collection := or.database.Collection(or.collection)

	var orders []domain.Order

	idHex, err := primitive.ObjectIDFromHex(groomerId)
	if err != nil {
		return orders, err
	}

	cursor, err := collection.Find(c, bson.M{"groomerId": idHex})
	if err != nil {
		return nil, err
	}

	err = cursor.All(c, &orders)
	if orders == nil {
		return []domain.Order{}, err
	}

	return orders, err
}

func (or *orderRepository) FetchByGroomerAndDateRange(
	c context.Context,
	groomerId string,
	rangeStart, rangeEnd time.Time,
) ([]domain.Order, error) {
	collection := or.database.Collection(or.collection)

	var orders []domain.Order

	idHex, err := primitive.ObjectIDFromHex(groomerId)
	if err != nil {
		return orders, err
	}

	filter := bson.M{
		"groomerId":   idHex,
		"scheduledAt": bson.M{"$gte": rangeStart, "$lt": rangeEnd},
		"status":      bson.M{"$ne": domain.OrderStatusCancelled},
	}

	cursor, err := collection.Find(c, filter)
	if err != nil {
		return nil, err
	}

	err = cursor.All(c, &orders)
	if orders == nil {
		return []domain.Order{}, err
	}

	return orders, err
}

func (or *orderRepository) GetByID(c context.Context, id string) (domain.Order, error) {
	collection := or.database.Collection(or.collection)

	var order domain.Order

	idHex, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return order, err
	}

	err = collection.FindOne(c, bson.M{"_id": idHex}).Decode(&order)
	return order, err
}

func (or *orderRepository) UpdateStatus(c context.Context, id string, status domain.OrderStatus, changedBy primitive.ObjectID) error {
	collection := or.database.Collection(or.collection)

	idHex, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	change := domain.OrderStatusChange{
		Status:    status,
		ChangedAt: time.Now(),
		ChangedBy: changedBy,
	}

	_, err = collection.UpdateOne(
		c,
		bson.M{"_id": idHex},
		bson.M{
			"$set":  bson.M{"status": status},
			"$push": bson.M{"statusHistory": change},
		},
	)
	return err
}

func (or *orderRepository) CountCompletedByPetID(c context.Context, petId string) (int64, error) {
	collection := or.database.Collection(or.collection)

	idHex, err := primitive.ObjectIDFromHex(petId)
	if err != nil {
		return 0, err
	}

	return collection.CountDocuments(c, bson.M{"petId": idHex, "status": domain.OrderStatusCompleted})
}
