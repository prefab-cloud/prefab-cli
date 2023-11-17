type Json = Record<string, unknown>

export type Noop = {
  error: false
  json?: Json
  message?: string
  ok: false
}

export type Failure = {
  error: true
  json?: Json
  message: string
  ok: false
}

export type Success<T> = {
  error: false
  json?: Json
  message?: string
  ok: true
  value: T
}

export type Result<T> = Failure | Noop | Success<T>

export const noop = (message?: string): Noop => ({error: false, message, ok: false})

export const failure = (message: string, json?: Json): Failure => ({error: true, json, message, ok: false})

export const success = <T>(value: T, message?: string, json?: Json): Success<T> => ({
  error: false,
  json,
  message,
  ok: true,
  value,
})
