import { z } from 'zod';

export const schemas = {
  register: z.object({
    email: z.string().email('Email non valida').max(255),
    password: z.string().min(8, 'Minimo 8 caratteri')
      .regex(/[A-Z]/, 'Almeno una maiuscola')
      .regex(/[a-z]/, 'Almeno una minuscola')
      .regex(/[0-9]/, 'Almeno un numero'),
    name: z.string().max(100).optional(),
  }),

  login: z.object({
    email: z.string().email('Email non valida'),
    password: z.string().min(1, 'Password richiesta'),
  }),

  refresh: z.object({
    refreshToken: z.string().min(1, 'Refresh token richiesto'),
  }),

  forgotSendOtp: z.object({
    email: z.string().email('Email non valida'),
  }),

  resetPassword: z.object({
    email: z.string().email('Email non valida'),
    otp: z.string().length(6, 'OTP deve essere di 6 cifre'),
    newPassword: z.string().min(8, 'Minimo 8 caratteri')
      .regex(/[A-Z]/, 'Almeno una maiuscola')
      .regex(/[a-z]/, 'Almeno una minuscola')
      .regex(/[0-9]/, 'Almeno un numero'),
  }),

  profileUpdate: z.object({
    name: z.string().min(1, 'Nome obbligatorio').max(100).optional(),
    surname: z.string().max(100).optional(),
  }),

  changePassword: z.object({
    oldPassword: z.string().min(1, 'Password attuale richiesta'),
    newPassword: z.string().min(8, 'Minimo 8 caratteri')
      .regex(/[A-Z]/, 'Almeno una maiuscola')
      .regex(/[a-z]/, 'Almeno una minuscola')
      .regex(/[0-9]/, 'Almeno un numero'),
  }),

  sendOtp: z.object({
    newEmail: z.string().email('Email non valida').optional(),
  }),

  verifyOtp: z.object({
    otp: z.string().length(6, 'OTP deve essere di 6 cifre'),
    newEmail: z.string().email('Email non valida').optional(),
  }),

  avatar: z.object({
    avatar: z.string()
      .min(1, 'Immagine richiesta')
      .max(2 * 1024 * 1024, 'Immagine troppo grande (max 2MB)')
      .regex(/^data:image\/(jpeg|png|gif|webp);base64,/, 'Formato immagine non valido'),
  }),

  deleteAccount: z.object({
    otp: z.string().length(6, 'OTP deve essere di 6 cifre'),
  }),

  transaction: z.object({
    type: z.enum(['income', 'expense']),
    title: z.string().min(1, 'Titolo obbligatorio').max(200),
    amount: z.number().positive('Importo deve essere positivo').max(999999999),
    category: z.string().min(1, 'Categoria obbligatoria').max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve essere YYYY-MM-DD'),
    note: z.string().max(1000).optional(),
  }),

  recurring: z.object({
    title: z.string().min(1, 'Titolo obbligatorio').max(200),
    amount: z.number().positive('Importo deve essere positivo').max(999999999),
    type: z.enum(['income', 'expense']),
    category: z.string().min(1, 'Categoria obbligatoria').max(100),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve essere YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve essere YYYY-MM-DD').optional().nullable(),
    active: z.boolean().optional(),
  }),

  budget: z.object({
    category: z.string().min(1, 'Categoria obbligatoria').max(100),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Mese deve essere YYYY-MM'),
    amount: z.number().positive('Importo deve essere positivo').max(999999999),
  }),

  goal: z.object({
    name: z.string().min(1, 'Nome obbligatorio').max(200),
    target_amount: z.number().positive('Importo target deve essere positivo').max(999999999),
    current_amount: z.number().min(0, 'Importo corrente non può essere negativo').optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve essere YYYY-MM-DD').optional().nullable(),
    category: z.string().max(100).optional(),
  }),

  translate: z.object({
    text: z.string().min(1, 'Testo richiesto').max(500),
    from: z.string().min(1).max(50),
    to: z.string().min(1).max(50),
  }),

  reportSettings: z.object({
    report_enabled: z.boolean().optional(),
    report_day: z.number().int().min(1).max(28).optional(),
  }),

  reportSend: z.object({
    email: z.string().email('Email non valida').optional(),
  }),
};

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error = result.error.errors.map(e => e.message).join('. ');
      return res.status(400).json({ error: error || 'Dati non validi' });
    }
    req.body = result.data;
    next();
  };
}
