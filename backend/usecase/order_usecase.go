package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type orderUsecase struct {
	orderRepository domain.OrderRepository
	userRepository  domain.UserRepository
	petRepository   domain.PetRepository
	contextTimeout  time.Duration
}

func NewOrderUsecase(
	orderRepository domain.OrderRepository,
	userRepository domain.UserRepository,
	petRepository domain.PetRepository,
	timeout time.Duration,
) domain.OrderUsecase {
	return &orderUsecase{
		orderRepository: orderRepository,
		userRepository:  userRepository,
		petRepository:   petRepository,
		contextTimeout:  timeout,
	}
}

func (ou *orderUsecase) CreateOrder(c context.Context, request *domain.OrderRequest) (*domain.Order, error) {
	ctx, cancel := context.WithTimeout(c, ou.contextTimeout)
	defer cancel()

	groomerID, err := primitive.ObjectIDFromHex(request.GroomerID)
	if err != nil {
		return nil, fmt.Errorf("invalid groomerId: %w", err)
	}

	groomer, err := ou.userRepository.GetByID(ctx, request.GroomerID)
	if err != nil {
		return nil, fmt.Errorf("groomer not found: %w", err)
	}
	if !groomer.IsGroomer {
		return nil, errors.New("specified user is not a groomer")
	}

	client, err := ou.findOrCreateClient(ctx, request)
	if err != nil {
		return nil, err
	}

	pet, err := ou.findOrCreatePet(ctx, request, client.ID)
	if err != nil {
		return nil, err
	}

	serviceIDs, err := toObjectIDs(request.ServiceIDs)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	order := domain.Order{
		ID:              primitive.NewObjectID(),
		ClientID:        client.ID,
		PetID:           pet.ID,
		GroomerID:       groomerID,
		CreatedAt:       now,
		ScheduledAt:     request.ScheduledAt,
		DurationMinutes: request.DurationMinutes,
		Status:          domain.OrderStatusPending,
		Comment:         request.Comment,
		ServiceIDs:      serviceIDs,
	}

	if err := ou.orderRepository.Create(ctx, &order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	return &order, nil
}

func (ou *orderUsecase) FetchBusySlots(c context.Context, groomerId string, from, to time.Time) ([]domain.BusySlot, error) {
	ctx, cancel := context.WithTimeout(c, ou.contextTimeout)
	defer cancel()

	rangeStart := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, from.Location())
	rangeEnd := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, to.Location()).AddDate(0, 0, 1)

	orders, err := ou.orderRepository.FetchByGroomerAndDateRange(ctx, groomerId, rangeStart, rangeEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch busy slots: %w", err)
	}

	busySlots := make([]domain.BusySlot, 0, len(orders))
	for _, order := range orders {
		busySlots = append(busySlots, domain.BusySlot{
			ScheduledAt:     order.ScheduledAt,
			DurationMinutes: order.DurationMinutes,
		})
	}

	return busySlots, nil
}

func (ou *orderUsecase) findOrCreateClient(ctx context.Context, request *domain.OrderRequest) (domain.User, error) {
	client, err := ou.userRepository.GetByPhone(ctx, request.ClientPhone)
	if err == nil {
		return client, nil
	}

	client = domain.User{
		ID:        primitive.NewObjectID(),
		Name:      request.ClientName,
		Phone:     request.ClientPhone,
		Email:     request.ClientEmail,
		CreatedAt: time.Now(),
	}

	if err := ou.userRepository.Create(ctx, &client); err != nil {
		return client, fmt.Errorf("failed to create client: %w", err)
	}

	return client, nil
}

func (ou *orderUsecase) findOrCreatePet(
	ctx context.Context,
	request *domain.OrderRequest,
	clientID primitive.ObjectID,
) (domain.Pet, error) {
	pet, err := ou.petRepository.GetByUserIDAndName(ctx, clientID.Hex(), request.PetName)
	if err == nil {
		return pet, nil
	}

	pet = domain.Pet{
		ID:        primitive.NewObjectID(),
		Name:      request.PetName,
		Age:       request.PetAge,
		Weight:    request.PetWeight,
		PhotoUrl:  request.PetPhotoUrl,
		UserID:    clientID,
		CreatedAt: time.Now(),
		Comment:   request.PetComment,
	}

	if err := ou.petRepository.Create(ctx, &pet); err != nil {
		return pet, fmt.Errorf("failed to create pet: %w", err)
	}

	return pet, nil
}

func toObjectIDs(ids []string) ([]primitive.ObjectID, error) {
	result := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		idHex, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return nil, fmt.Errorf("invalid serviceId %q: %w", id, err)
		}
		result = append(result, idHex)
	}
	return result, nil
}
