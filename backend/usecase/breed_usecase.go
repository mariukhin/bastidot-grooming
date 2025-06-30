package usecase

import (
	"context"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type breedUsecase struct {
	breedRepository domain.BreedRepository
	contextTimeout time.Duration
}

func NewBreedUsecase(breedRepository domain.BreedRepository, timeout time.Duration) domain.BreedRepository {
	return &breedUsecase{
		breedRepository: breedRepository,
		contextTimeout: timeout,
	}
}

func (br *breedUsecase) Create(c context.Context, breed *domain.Breed) error {
	ctx, cancel := context.WithTimeout(c, br.contextTimeout)
	defer cancel()
	return br.breedRepository.Create(ctx, breed)
}

func (br *breedUsecase) Fetch(c context.Context) ([]domain.Breed, error) {
	ctx, cancel := context.WithTimeout(c, br.contextTimeout)
	defer cancel()
	return br.breedRepository.Fetch(ctx)
}

func (br *breedUsecase) GetByID(c context.Context, id string) (domain.Breed, error) {
	ctx, cancel := context.WithTimeout(c, br.contextTimeout)
	defer cancel()
	return br.breedRepository.GetByID(ctx, id)
}
