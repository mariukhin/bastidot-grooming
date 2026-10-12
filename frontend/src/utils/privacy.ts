/**
 * Версія політики їде разом із записом: через рік треба буде знати, на що саме
 * людина погодилась. Міняти — щоразу, коли міняється текст на /privacy.
 */
export const PRIVACY_POLICY_VERSION = '2026-10-12';

export const PRIVACY_PATH = '/privacy';

/**
 * Реквізити володільця даних. legalName і taxId знає лише власник — поки вони
 * порожні, сторінка показує салон за брендом і адресою.
 */
export const PRIVACY_CONTROLLER = {
  legalName: '',
  taxId: '',
  email: '',
} as const;
