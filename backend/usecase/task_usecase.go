package usecase

import (
	"context"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
)

type serviceUsecase struct {
	serviceRepository domain.ServiceRepository
	contextTimeout time.Duration
}

func NewServiceUsecase(serviceRepository domain.ServiceRepository, timeout time.Duration) domain.ServiceRepository {
	return &serviceUsecase{
		serviceRepository: serviceRepository,
		contextTimeout: timeout,
	}
}


func (s *serviceUsecase) FetchByBreedID(c context.Context, breedId string) ([]domain.Task, error) {
	ctx, cancel := context.WithTimeout(c, tu.contextTimeout)
	defer cancel()
	return tu.taskRepository.FetchByUserID(ctx, userID)
}
