// User переїхав у shared/ (ним користуються auth, groomer, order).
// Реекспортуємо, щоб решта groomer-коду не змінювала імпорти.
export { USER_COLLECTION, type User } from '../../shared/user.ts';