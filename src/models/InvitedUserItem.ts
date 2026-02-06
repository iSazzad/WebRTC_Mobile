export type InvitationStatus = "pending" | "accepted" | "rejected";

export interface IUserSummary {
  _id: string;
  name: string;
  email: string;
  userId: string;
}

export interface InvitedUser {
  _id: string;
  fromUser: IUserSummary; // populated user
  toUser: string; // ObjectId as string
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}
