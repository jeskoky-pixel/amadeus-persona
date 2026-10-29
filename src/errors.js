/**
 * Stable, non-reflective errors for the Persona Host surface.
 *
 * HTTP handlers return these codes and messages only.  Raw exceptions,
 * filesystem paths, prompt bodies, Session ids and QQ Scene ids never become
 * part of an error string by default.
 */

export class PersonaError extends Error {
  /**
   * @param {string} code stable machine code.
   * @param {number} status HTTP status.
   * @param {string} message fixed human message.
   */
  constructor(code, status, message) {
    super(message);
    this.name = 'PersonaError';
    this.code = code;
    this.status = status;
  }
}

export class PersonaValidationError extends PersonaError {
  /**
   * @param {string} message fixed field-level message.
   * @param {Record<string, unknown>} [details] optional safe structured details.
   */
  constructor(message, details) {
    super('PERSONA_INVALID', 400, message);
    if (details !== undefined) this.details = details;
  }
}

export class PersonaConflictError extends PersonaError {
  /**
   * @param {number} currentRevision current global revision.
   */
  constructor(currentRevision) {
    super('PERSONA_CONFLICT', 409, 'persona changed; reload before retrying');
    this.currentRevision = currentRevision;
  }
}

export class PersonaNotFoundError extends PersonaError {
  /**
   * @param {string} message fixed message.
   */
  constructor(message) {
    super('PERSONA_NOT_FOUND', 404, message);
  }
}

export class PersonaStorageError extends PersonaError {
  /**
   * @param {string} [message] fixed message. Never include a path or raw parser text.
   */
  constructor(message = 'persona storage is unavailable') {
    super('PERSONA_STORAGE_UNAVAILABLE', 503, message);
  }
}

export class PersonaUnavailableError extends PersonaError {
  /**
   * @param {string} code stable code.
   * @param {string} message fixed message.
   */
  constructor(code, message) {
    super(code, 503, message);
  }
}

/**
 * Convert any thrown value into the fixed public error shape.
 * @param {unknown} error thrown value.
 * @returns {{status: number, code: string, message: string, currentRevision?: number, details?: Record<string, unknown>}} public failure.
 */
export function publicFailure(error) {
  if (error instanceof PersonaError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      ...(error.currentRevision === undefined ? {} : { currentRevision: error.currentRevision }),
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }
  if (error instanceof TypeError) {
    return { status: 400, code: 'PERSONA_INVALID', message: 'invalid persona request' };
  }
  return { status: 500, code: 'PERSONA_INTERNAL', message: 'persona request failed' };
}
