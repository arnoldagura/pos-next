import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function error(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message = 'Bad request') {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function validationError(err: ZodError) {
  return NextResponse.json(
    { error: 'Validation failed', details: err.issues },
    { status: 400 }
  );
}

export function handleApiError(err: unknown, fallbackMessage = 'Internal server error') {
  console.error(fallbackMessage, err);

  if (err instanceof ZodError) {
    return validationError(err);
  }

  return error(
    err instanceof Error ? err.message : fallbackMessage,
    500
  );
}
