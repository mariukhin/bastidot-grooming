package controller

func jsonError(message string) string {
	return `{"error": "` + message + `"}`
}
