package domain

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	CollectionUser = "user"
)

type User struct {
	ID        primitive.ObjectID `bson:"_id"`
	Name      string             `bson:"username"`
	Email     string             `bson:"email"`
	Phone     string             `bson:"phoneNumber"`
	PhotoUrl  string             `bson:"photoUrl"`
	Password  string             `bson:"password"`
	CreatedAt time.Time          `bson:"createdAt"`
	IsAdmin   bool               `bson:"isAdmin"`
	IsGroomer bool               `bson:"isGroomer"`
	// IsVip marks a groomer charging the higher "VIP" price tier (see
	// Service.VipPrice). Meaningless for users where IsGroomer is false.
	IsVip bool `bson:"isVip"`
}

type UserRepository interface {
	Create(c context.Context, user *User) error
	Fetch(c context.Context) ([]User, error)
	FetchGroomers(c context.Context) ([]User, error)
	GetByEmail(c context.Context, email string) (User, error)
	GetByPhone(c context.Context, phone string) (User, error)
	GetByID(c context.Context, id string) (User, error)
}
