export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type AuthUser = {
  username?: string;
  userKey?: string;
  role?: string;
  exp?: number;
};
