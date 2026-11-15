export class AppError extends Error {
  constructor(message: string, public code: string = "APP_ERROR") {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PrendaNoDisponibleError extends AppError {
  constructor(message = "Una o más prendas ya no están disponibles") {
    super(message, "PRENDA_NO_DISPONIBLE");
  }
}

export class PermisoDenegadoError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(message, "PERMISO_DENEGADO");
  }
}

export class NoEncontradoError extends AppError {
  constructor(message = "Registro no encontrado") {
    super(message, "NO_ENCONTRADO");
  }
}

export class ValidacionError extends AppError {
  constructor(message = "Datos inválidos") {
    super(message, "VALIDACION");
  }
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
