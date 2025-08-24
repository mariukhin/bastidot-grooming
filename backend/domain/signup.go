package domain

import (
	"context"
)

type SignupRequest struct {
    Name     string `json:"username"`
    Email    string `json:"email" binding:"required,email"`
    Phone    string `json:"phoneNumber" binding:"required,string,len=12"`
    Password string `json:"password" binding:"required"`
}

type SignupResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type SignupUsecase interface {
	Create(c context.Context, user *User) error
	GetUserByEmail(c context.Context, email string) (User, error)
	GetUserByPhone(c context.Context, phone string) (User, error)
	CreateAccessToken(user *User, secret string, expiry int) (accessToken string, err error)
	CreateRefreshToken(user *User, secret string, expiry int) (refreshToken string, err error)
}
