import { api } from './client'
import type {
  ListNodesResponse, GetNodeResponse,
  HeadscaleNode, ApproveRoutesRequest, SetTagsRequest, MoveNodeRequest,
} from './types'

export const nodesApi = {
  list: (user?: string): Promise<ListNodesResponse> =>
    api.get(`/node${user ? `?user=${encodeURIComponent(user)}` : ''}`),

  get: (id: string): Promise<GetNodeResponse> =>
    api.get(`/node/${id}`),

  delete: (id: string): Promise<void> =>
    api.delete(`/node/${id}`),

  rename: (id: string, newName: string): Promise<GetNodeResponse> =>
    api.post(`/node/${id}/rename/${encodeURIComponent(newName)}`),

  expire: (id: string): Promise<GetNodeResponse> =>
    api.post(`/node/${id}/expire`),

  setTags: (id: string, tags: string[]): Promise<GetNodeResponse> =>
    api.post<GetNodeResponse>(`/node/${id}/tags`, { tags } satisfies SetTagsRequest),

  moveToUser: (id: string, user: string): Promise<GetNodeResponse> =>
    api.post<GetNodeResponse>(`/node/${id}/user`, { user } satisfies MoveNodeRequest),

  approveRoutes: (id: string, routes: string[]): Promise<GetNodeResponse> =>
    api.post<GetNodeResponse>(`/node/${id}/approve_routes`, { routes } satisfies ApproveRoutesRequest),

  register: (key: string, user: string): Promise<GetNodeResponse> =>
    api.post(`/node/register?key=${encodeURIComponent(key)}&user=${encodeURIComponent(user)}`),
}

// Helpers
export function getNodeDisplayName(node: HeadscaleNode): string {
  return node.givenName || node.name
}

export function getNodeTailscaleIp(node: HeadscaleNode): string | undefined {
  return node.ipAddresses.find(ip => ip.startsWith('100.'))
}
