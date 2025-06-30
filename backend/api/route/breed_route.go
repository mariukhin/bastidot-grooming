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

func NewBreedRouter(env *bootstrap.Env, timeout time.Duration, db mongo.Database, router chi.Router) {
	rep := repository.NewBreedRepository(db, domain.CollectionBreed)
	br := &controller.BreedController{
		BreedRepository: usecase.NewBreedUsecase(rep, timeout),
	}
	router.Get("/breed", br.Fetch)
	router.Post("/breed", br.Create)
}
