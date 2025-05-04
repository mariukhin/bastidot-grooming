## Architecture Layers of the project

- Router
- Controller
- Usecase
- Repository
- Domain

![Go Backend Clean Architecture Diagram](https://github.com/altafino/go-backend-clean-architecture-chi/blob/main/assets/go-backend-arch-diagram.png?raw=true)

## Major Packages used in this project

- **chi**: Chi is an HTTP web framework written in Go (Golang) using standard library net/http. It's lightweight and fast.
- **mongo go driver**: The Official Golang driver for MongoDB.
- **jwt**: JSON Web Tokens are an open, industry-standard RFC 7519 method for representing claims securely between two parties. Used for Access Token and Refresh Token.
- **viper**: For loading configuration from the `.env` file. Go configuration with fangs. Find, load, and unmarshal a configuration file in JSON, TOML, YAML, HCL, INI, envfile, or Java properties formats.
- **bcrypt**: Package bcrypt implements Provos and Mazières's bcrypt adaptive hashing algorithm.
- **testify**: A toolkit with common assertions and mocks that plays nicely with the standard library.
- **mockery**: A mock code autogenerator for Golang used in testing.
- Check more packages in `go.mod`.

### Public API Request Flow without JWT Authentication Middleware

![Public API Request Flow](https://github.com/altafino/go-backend-clean-architecture-chi/blob/main/assets/go-arch-public-api-request-flow.png?raw=true)

### Private API Request Flow with JWT Authentication Middleware

> JWT Authentication Middleware for Access Token Validation.

![Private API Request Flow](https://github.com/altafino/go-backend-clean-architecture-chi/blob/main/assets/go-arch-private-api-request-flow.png?raw=true)

#### Run without Docker

- Create a file `.env` similar to `.env.example` at the root directory with your configuration.
- Install `go` if not installed on your machine.
- Install `MongoDB` if not installed on your machine.
- Important: Change the `DB_HOST` to `localhost` (`DB_HOST=localhost`) in `.env` configuration file. `DB_HOST=mongodb` is needed only when you run with Docker.
- Run `go run cmd/main.go`.
- Access API using `http://localhost:8080`

#### Run with Docker

- Create a file `.env` similar to `.env.example` at the root directory with your configuration.
- Install Docker and Docker Compose.
- Run `docker-compose up -d`.
- Access API using `http://localhost:8080`

### How to run the test?

```bash
# Run all tests
go test ./...
```

### How to generate the mock code?

In this project, to test, we need to generate mock code for the use-case, repository, and database.

```bash
# Generate mock code for the usecase and repository
mockery --dir=domain --output=domain/mocks --outpkg=mocks --all

# Generate mock code for the database
mockery --dir=mongo --output=mongo/mocks --outpkg=mocks --all
```

Whenever you make changes in the interfaces of these use-cases, repositories, or databases, you need to run the corresponding command to regenerate the mock code for testing.

### The Complete Project Folder Structure

```
.
├── Dockerfile
├── api
│   ├── controller
│   │   ├── error.go
│   │   ├── login_controller.go
│   │   ├── profile_controller.go
│   │   ├── profile_controller_test.go
│   │   ├── refresh_token_controller.go
│   │   ├── signup_controller.go
│   │   └── task_controller.go
│   ├── middleware
│   │   └── jwt_auth_middleware.go
│   └── route
│       ├── login_route.go
│       ├── profile_route.go
│       ├── refresh_token_route.go
│       ├── route.go
│       ├── signup_route.go
│       └── task_route.go
├── bootstrap
│   ├── app.go
│   ├── database.go
│   └── env.go
├── cmd
│   └── main.go
├── docker-compose.yaml
├── domain
│   ├── error_response.go
│   ├── jwt_custom.go
│   ├── login.go
│   ├── profile.go
│   ├── refresh_token.go
│   ├── signup.go
│   ├── success_response.go
│   ├── task.go
│   └── user.go
├── go.mod
├── go.sum
├── internal
│   └── tokenutil
│       └── tokenutil.go
├── mongo
│   └── mongo.go
├── repository
│   ├── task_repository.go
│   ├── user_repository.go
│   └── user_repository_test.go
└── usecase
    ├── login_usecase.go
    ├── profile_usecase.go
    ├── refresh_token_usecase.go
    ├── signup_usecase.go
    ├── task_usecase.go
    └── task_usecase_test.go
```

### API Endpoints

- Public Routes (no authentication required):
  - POST `/public/signup`
  - POST `/public/login`
  - POST `/public/refresh`

- Protected Routes (require JWT authentication):
  - GET `/protected/profile`
  - POST `/protected/task`
  - GET `/protected/task`

### Example API Request and Response

- signup

  - Request

  ```
  curl --location --request POST 'http://localhost:8080/public/signup' \
    --header 'Content-Type: application/json' \
    --data-raw '{
    "email": "test@gmail.com",
    "password": "test",
    "name": "Test Name"
    }'
  ```

  - Response

  ```json
  {
    "accessToken": "access_token",
    "refreshToken": "refresh_token"
  }
  ```

- login

  - Request

  ```
  curl --location --request POST 'http://localhost:8080/public/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "email": "test@gmail.com",
  "password": "test"
  }'

  ```

  - Response

  ```json
  {
    "accessToken": "access_token",
    "refreshToken": "refresh_token"
  }
  ```

- profile

  - Request

  ```
  curl --location --request GET 'http://localhost:8080/protected/profile' \
  --header 'Authorization: Bearer access_token'
  ```

  - Response

  ```json
  {
    "name": "Test Name",
    "email": "test@gmail.com"
  }
  ```

- task create

  - Request

  ```
  curl --location --request POST 'http://localhost:8080/protected/task' \
  --header 'Authorization: Bearer access_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "title": "Test Task"
  }'
  ```

  - Response

  ```json
  {
    "message": "Task created successfully"
  }
  ```

- task fetch

  - Request

  ```
  curl --location --request GET 'http://localhost:8080/protected/task' \
  --header 'Authorization: Bearer access_token'
  ```

  - Response

  ```json
  [
    {
      "title": "Test Task"
    },
    {
      "title": "Test Another Task"
    }
  ]
  ```

- refresh token

  - Request

  ```
  curl --location --request POST 'http://localhost:8080/public/refresh' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "refreshToken": "refresh_token"
  }'
  ```

  - Response

  ```json
  {
    "accessToken": "access_token",
    "refreshToken": "refresh_token"
  }
  ```
