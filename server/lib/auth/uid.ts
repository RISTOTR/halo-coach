import { createError } from 'h3'

export function requireUid(user: any) {
  const uid = user?.id || user?.sub
  if (!uid || uid === 'undefined') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized (missing uid)' })
  }
  return uid as string
}