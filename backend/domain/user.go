package domain

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionUser = "user"
)

type User struct {
	ID       primitive.ObjectID `bson:"_id"`
	Name     string             `bson:"username"`
	Email    string             `bson:"email"`
	Phone    string             `bson:"phoneNumber"`
	PhotoUrl string             `bson:"photoUrl"`
	Password string             `bson:"password"`
}

type UserRepository interface {
	Create(c context.Context, user *User) error
	Fetch(c context.Context) ([]User, error)
	GetByEmail(c context.Context, email string) (User, error)
	GetByPhone(c context.Context, phone string) (User, error)
	GetByID(c context.Context, id string) (User, error)
}
