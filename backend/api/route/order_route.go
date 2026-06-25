package route

import (
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/altafino/go-backend-clean-architecture-chi/api/controller"
	"github.com/altafino/go-backend-clean-architecture-chi/bootstrap"
	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"github.com/altafino/go-backend-clean-architecture-chi/repository"
	"github.com/altafino/go-backend-clean-architecture-chi/usecase"
)

func NewOrderRouter(env *bootstrap.Env, timeout time.Duration, db mongo.Database, router chi.Router) {
	orderRepository := repository.NewOrderRepository(db, domain.CollectionOrder)
	userRepository := repository.NewUserRepository(db, domain.CollectionUser)
	petRepository := repository.NewPetRepository(db, domain.CollectionPet)

	oc := &controller.OrderController{
		OrderUsecase: usecase.NewOrderUsecase(orderRepository, userRepository, petRepository, timeout),
	}

	router.Post("/order", oc.Create)
}
