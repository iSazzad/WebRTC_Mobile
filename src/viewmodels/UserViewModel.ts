import * as userApi from "../api/user";

export default class UserViewModel {
  // Simple wrapper over the api functions so UI can call methods easily

  async createUser(name: string | undefined, email: string | undefined) {
    const payload: userApi.UserCreatePayload | null =
      email !== undefined ? { name, email } : null;
    const user = await userApi.createUser(payload);
    return user;
  }

  async updateUser(name: string | undefined, email: string | undefined) {
    let payload: userApi.UserCreatePayload = {};
    if (email) {
      payload.email = email;
    }

    if (name) {
      payload.name = name;
    }
    const user = await userApi.updateUser(payload);
    return user;
  }

  async getUser() {
    return userApi.getUser();
  }

  async getUserByEmail(email: string) {
    return userApi.getUserByEmail(email);
  }

  async sendOtpToEmail(email: string) {
    const payload: userApi.UserCreatePayload = {
      email,
    };
    const response = await userApi.sendOTPToUserEmail(payload);
    return response;
  }

  async verifyOtp(email: string, otp: string) {
    const payload: userApi.UserCreatePayload = {
      email,
      otp: otp,
    };
    const response = await userApi.verifyOTPUserEmail(payload);
    return response;
  }
}
