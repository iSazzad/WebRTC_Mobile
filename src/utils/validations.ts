export const isValidOtp = (otp: string) => /^[0-9]{6}$/.test(otp);
