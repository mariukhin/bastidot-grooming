import { object, string, ObjectSchema } from 'yup';

export type FormExampleFormData = {
  name: string;
  description?: string;
  phoneNumber: string;
  type: string;
};

export const formExampleValidationSchema: ObjectSchema<FormExampleFormData> = object({
  name: string().required('Required'),
  description: string().optional(),
  phoneNumber: string()
    .required('Required')
    .test('is-full-ukrainian-phone', 'Incomplete phone number', (value) => {
      if (!value) return false;
      const digits = value.replace(/\D/g, '');
      return digits.length === 12 && digits.startsWith('380');
    }),
  type: string().required('Required'),
});
