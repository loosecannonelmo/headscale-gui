// Headscale API types — based on headscale's OpenAPI spec

export interface HeadscaleUser {
  id: string
  name: string
  createdAt: string
  displayName?: string
  profilePicUrl?: string
}

export interface HeadscaleNode {
  id: string
  machineKey: string
  nodeKey: string
  discoKey: string
  ipAddresses: string[]
  name: string
  user: HeadscaleUser
  lastSeen: string
  expiry: string | null
  createdAt: string
  registerMethod: 'REGISTER_METHOD_AUTH_KEY' | 'REGISTER_METHOD_OIDC' | 'REGISTER_METHOD_CLI' | string
  online: boolean           // authoritative — use this, not lastSeen math
  isExpired: boolean
  tags: string[]            // v0.28.0: unified tags field (replaces forcedTags/validTags/invalidTags)
  // v0.28.0 route fields (string[] of CIDRs, not route objects)
  availableRoutes: string[] // CIDRs the node is advertising
  approvedRoutes: string[]  // CIDRs admin has approved
  subnetRoutes: string[]    // CIDRs currently active as subnet routes
  givenName?: string
}

export interface HeadscalePreAuthKey {
  user: HeadscaleUser   // v0.28.0: full user object, not just a username string
  id: string
  key: string
  reusable: boolean
  ephemeral: boolean
  used: boolean
  expiration: string
  createdAt: string
  aclTags: string[]
}

export interface HeadscaleApiKey {
  id: string
  prefix: string
  expiration: string
  createdAt: string
  lastSeen?: string
}

export interface HeadscalePolicy {
  policy: string
  updatedAt: string
}

export interface HeadscaleHealth {
  services: Record<string, { status: string }>
}

// API Response wrappers
export interface ListUsersResponse { users: HeadscaleUser[] }
export interface ListNodesResponse { nodes: HeadscaleNode[] }
export interface ListPreAuthKeysResponse { preAuthKeys: HeadscalePreAuthKey[] }
export interface ListApiKeysResponse { apiKeys: HeadscaleApiKey[] }
export interface GetNodeResponse { node: HeadscaleNode }
export interface GetUserResponse { user: HeadscaleUser }

// Create/Update request bodies
export interface CreateUserRequest { name: string }
export interface CreatePreAuthKeyRequest {
  user: string
  reusable: boolean
  ephemeral: boolean
  expiration: string
  aclTags: string[]
}
export interface CreateApiKeyRequest { expiration: string }
export interface ApproveRoutesRequest { routes: string[] }
export interface SetTagsRequest { tags: string[] }
export interface MoveNodeRequest { user: string }

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
