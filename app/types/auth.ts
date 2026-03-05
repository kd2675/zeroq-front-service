export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type AuthUser = {
  username?: string;
  userId?: number;
  role?: string;
  exp?: number;
};
