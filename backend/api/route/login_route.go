package route

import (
	"time"
	"log"

	"github.com/go-chi/chi/v5"

	"github.com/altafino/go-backend-clean-architecture-chi/api/controller"
	"github.com/altafino/go-backend-clean-architecture-chi/bootstrap"
	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"github.com/altafino/go-backend-clean-architecture-chi/mongo"
	"github.com/altafino/go-backend-clean-architecture-chi/repository"
	"github.com/altafino/go-backend-clean-architecture-chi/usecase"
)

func NewLoginRouter(env *bootstrap.Env, timeout time.Duration, db mongo.Database, router chi.Router) {
    googleClientID := env.GoogleClientId
    if googleClientID == "" {
    	log.Fatal("GOOGLE_CLIENT_ID not found in environment variables")
    }
	ur := repository.NewUserRepository(db, domain.CollectionUser)
	lc := &controller.LoginController{
		LoginUsecase: usecase.NewLoginUsecase(ur, timeout),
		Env:          env,
	}
	router.Post("/public/login", lc.Login)
	router.Post("/public/login/google", lc.LoginWithGoogle)
}
