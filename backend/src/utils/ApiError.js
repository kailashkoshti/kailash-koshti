class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong") {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;
    this.name = "ApiError";
  }
}

export { ApiError };
