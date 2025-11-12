import { apiRequest } from "./client";

export interface UserCreatePayload {
  name: string | undefined;
  email: string;
}

export interface UserModel {
  userId: string;
  name: string;
  email: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface CreateUserResponse {
  message: string;
  user: UserModel;
  tokens: Tokens;
}

export async function createUser(
  payload: UserCreatePayload | null
): Promise<CreateUserResponse> {
  return apiRequest<CreateUserResponse>("/users", {
    method: "POST",
    body: payload ? payload : {},
  });
}

export async function getUser(): Promise<UserModel> {
  return apiRequest<UserModel>(`/users`);
}

export async function getUserByEmail(email: string): Promise<UserModel> {
  return apiRequest<UserModel>(`/users/${encodeURIComponent(email)}`);
}
