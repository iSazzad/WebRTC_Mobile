import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./client";

export interface UserCreatePayload {
  name?: string | undefined;
  email?: string;
  otp?: string | undefined;
}

export interface UserModel {
  userId: string;
  name: string;
  email: string;
  expiresIn: string | undefined;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface CreateUserResponse {
  user: UserModel;
  tokens: Tokens;
}

export interface CommonResponse<T> {
  message: string;
  data: T;
}

export async function createUser(
  payload: UserCreatePayload | null
): Promise<CommonResponse<CreateUserResponse>> {
  return apiRequest<CommonResponse<CreateUserResponse>>("/users", {
    method: "POST",
    body: payload ? payload : {},
  });
}

export async function updateUser(payload: {}): Promise<
  CommonResponse<CreateUserResponse>
> {
  return apiRequest<CommonResponse<CreateUserResponse>>("/users", {
    method: "PUT",
    body: payload ? payload : {},
  });
}

export async function getUser(): Promise<CommonResponse<UserModel>> {
  return apiRequest<CommonResponse<UserModel>>(`/users`);
}

export async function getAllUsers(): Promise<CommonResponse<UserModel[]>> {
  return apiRequest<CommonResponse<UserModel[]>>(`/users/all`);
}

export async function getUserByEmail(
  email: string
): Promise<CommonResponse<CreateUserResponse>> {
  return apiRequest<CommonResponse<CreateUserResponse>>(
    `/users/${encodeURIComponent(email)}`
  );
}

export async function sendOTPToUserEmail(
  payload: UserCreatePayload | null
): Promise<CommonResponse<{}>> {
  return apiRequest<CommonResponse<{}>>("/users/send-otp", {
    method: "POST",
    body: payload,
  });
}

export async function verifyOTPUserEmail(
  payload: UserCreatePayload | null
): Promise<CommonResponse<CreateUserResponse>> {
  return apiRequest<CommonResponse<CreateUserResponse>>("/users/verify-otp", {
    method: "POST",
    body: payload,
  });
}
