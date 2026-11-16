import type { ObjectId } from 'mongodb';

export const USER_COLLECTION = 'user';

export interface User {
  _id?: ObjectId;
  username: string;
  email?: string;
  phoneNumber: string;
  phoneVerifiedAt?: Date;
  photoUrl: string;
  photoPreviewUrl?: string;
  password: string;
  isAdmin: boolean;
  isGroomer: boolean;
  isVip: boolean;
  /** false — грумера не пропонують в онлайн-записі на сайті. Немає поля — true. */
  onlineBooking?: boolean;
  createdAt: Date;
  clientId?: ObjectId;
}
