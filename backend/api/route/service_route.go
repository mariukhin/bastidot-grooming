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

func NewServiceRouter(env *bootstrap.Env, timeout time.Duration, db mongo.Database, router chi.Router) {
	rep := repository.NewServiceRepository(db, domain.CollectionService)
	tc := &controller.ServiceController{
	    ServiceRepository: usecase.NewServiceUsecase(rep, timeout),
	}
	router.Post("/service", tc.Fetch)
}
