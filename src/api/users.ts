import { api } from './client'
import type { ListUsersResponse, GetUserResponse, CreateUserRequest } from './types'

export const usersApi = {
  list: (): Promise<ListUsersResponse> =>
    api.get('/user'),

  create: (name: string): Promise<GetUserResponse> =>
    api.post<GetUserResponse>('/user', { name } satisfies CreateUserRequest),

  delete: (id: string): Promise<void> =>
    api.delete(`/user/${id}`),

  rename: (id: string, newName: string): Promise<GetUserResponse> =>
    api.post(`/user/${id}/rename/${encodeURIComponent(newName)}`),
}

export function validateUsername(name: string): string | null {
  if (!name) return 'Name is required'
  if (name.length < 2) return 'Name must be at least 2 characters'
  if (!/^[a-zA-Z]/.test(name)) return 'Name must start with a letter'
  if (!/^[a-zA-Z0-9._@-]+$/.test(name)) return 'Only letters, numbers, dots, hyphens, underscores, and @ are allowed'
  if ((name.match(/@/g) || []).length > 1) return 'Only one @ is allowed'
  return null
}
