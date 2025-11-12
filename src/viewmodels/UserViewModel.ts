import * as userApi from "../api/user";

export default class UserViewModel {
  // Simple wrapper over the api functions so UI can call methods easily

  async createUser(name: string | undefined, email: string | undefined) {
    const payload: userApi.UserCreatePayload | null =
      email !== undefined
        ? { name, email }
        : null;
    const user = await userApi.createUser(payload);
    return user;
  }

  async getUser() {
    return userApi.getUser();
  }

  async getUserByEmail(email: string) {
    return userApi.getUserByEmail(email);
  }
}
