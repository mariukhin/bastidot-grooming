package controller

import (
    "context"
	"encoding/json"
	"net/http"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"

	"github.com/altafino/go-backend-clean-architecture-chi/bootstrap"
	"github.com/altafino/go-backend-clean-architecture-chi/domain"
	"golang.org/x/oauth2"
    "google.golang.org/api/option"
    oauth2v2 "google.golang.org/api/oauth2/v2"
)

type LoginController struct {
	LoginUsecase domain.LoginUsecase
	Env          *bootstrap.Env
}

func (lc *LoginController) Login(w http.ResponseWriter, r *http.Request) {
	var request domain.LoginRequest

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusBadRequest)
		return
	}

	user, err := lc.LoginUsecase.GetUserByEmail(r.Context(), request.Email)
	if err != nil {
		http.Error(w, jsonError("Хвостика з такою поштою не знайдено"), http.StatusNotFound)
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(request.Password)) != nil {
		http.Error(w, jsonError("Невірний логін чи пароль"), http.StatusUnauthorized)
		return
	}

	accessToken, err := lc.LoginUsecase.CreateAccessToken(&user, lc.Env.AccessTokenSecret, lc.Env.AccessTokenExpiryHour)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	refreshToken, err := lc.LoginUsecase.CreateRefreshToken(&user, lc.Env.RefreshTokenSecret, lc.Env.RefreshTokenExpiryHour)
	if err != nil {
		http.Error(w, jsonError(err.Error()), http.StatusInternalServerError)
		return
	}

	loginResponse := domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(loginResponse)
}

func (lc *LoginController) LoginWithGoogle(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    var request domain.LoginGoogleRequest
    err := json.NewDecoder(r.Body).Decode(&request)
    if err != nil {
    	http.Error(w, jsonError(err.Error()), http.StatusBadRequest)
    	return
    }

    if request.Token == "" {
    	http.Error(w, `{"error": "Token not found"}`, http.StatusBadRequest)
    	return
    }

    ctx := r.Context()
    oauth2Service, err := oauth2v2.NewService(ctx, option.WithHTTPClient(getGoogleClient(ctx, request.Token)))
    if err != nil {
    	http.Error(w, `{"error": "Failed to create Google service"}`, http.StatusInternalServerError)
    	return
    }

    userInfo, err := oauth2Service.Userinfo.Get().Do()
    if err != nil {
    	log.Printf("Failed to get user info: %v", err)
    	http.Error(w, `{"error": "Invalid or expired token"}`, http.StatusUnauthorized)
    	return
    }

    fullName := fmt.Sprintf("%s %s", userInfo.GivenName, userInfo.FamilyName)

    response := domain.User{
    	Name:       fullName,
        Email:      userInfo.Email,
        PhotoUrl:   userInfo.Picture,
    }

    json.NewEncoder(w).Encode(response)
}

func getGoogleClient(ctx context.Context, token string) *http.Client {
	tokenSource := oauth2.StaticTokenSource(
		&oauth2.Token{
			AccessToken: token,
		},
	)
	return oauth2.NewClient(ctx, tokenSource)
}
