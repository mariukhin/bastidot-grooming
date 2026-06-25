package domain

import "context"

// GroomerResponse is the public shape of a groomer — a User with
// IsGroomer=true, stripped of sensitive fields (password, email, phone).
type GroomerResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsVip    bool   `json:"isVip"`
	PhotoUrl string `json:"photoUrl"`
}

type GroomerUsecase interface {
	FetchGroomers(c context.Context) ([]GroomerResponse, error)
}
