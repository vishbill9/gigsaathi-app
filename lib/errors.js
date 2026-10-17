/** Error that carries an HTTP status and a message that is safe to show to the client. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
