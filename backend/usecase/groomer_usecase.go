package usecase

import (
	"context"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type groomerUsecase struct {
	userRepository domain.UserRepository
	contextTimeout time.Duration
}

func NewGroomerUsecase(userRepository domain.UserRepository, timeout time.Duration) domain.GroomerUsecase {
	return &groomerUsecase{
		userRepository: userRepository,
		contextTimeout: timeout,
	}
}

func (gu *groomerUsecase) FetchGroomers(c context.Context) ([]domain.GroomerResponse, error) {
	ctx, cancel := context.WithTimeout(c, gu.contextTimeout)
	defer cancel()

	groomers, err := gu.userRepository.FetchGroomers(ctx)
	if err != nil {
		return nil, err
	}

	response := make([]domain.GroomerResponse, 0, len(groomers))
	for _, g := range groomers {
		response = append(response, domain.GroomerResponse{
			ID:       g.ID.Hex(),
			Name:     g.Name,
			IsVip:    g.IsVip,
			PhotoUrl: g.PhotoUrl,
		})
	}

	return response, nil
}
