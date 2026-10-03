import type { ObjectId } from 'mongodb';

export const USER_COLLECTION = 'user';

// User — спільна доменна сутність (клієнти, грумери, адміни — усі тут).
// Живе в shared/, бо кілька фіч (auth, groomer, order) з нею працюють.
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  phoneNumber: string;
  photoUrl: string;
  password: string;
  isAdmin: boolean;
  isGroomer: boolean;
  isVip: boolean;
  createdAt: Date;
  // Картка клієнта в CRM (колекція client), якщо акаунт із нею звели. Звʼязок
  // зберігається лише тут: дублювати його ще й у client означало б тримати два
  // джерела правди, які рано чи пізно розійдуться. Зворотний пошук —
  // user.findOne({ clientId }) по індексу.
  clientId?: ObjectId;
}
