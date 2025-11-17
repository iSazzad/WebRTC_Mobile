import { UserModel } from "../api/user";

export type RootStackParamList = {
  NewUser: undefined;
  Join: { userDetails: UserModel };
  OutgoingCall: undefined;
  IncomingCall: undefined;
  WebrtcRoom: undefined;
  Dashboard: undefined;
};
