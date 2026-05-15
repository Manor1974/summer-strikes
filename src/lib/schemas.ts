import { z } from "zod";

export const childSchema = z.object({
  name: z.string().trim().min(2, "Child's full name required").max(80),
  age: z.coerce
    .number()
    .int("Age must be a whole number")
    .min(2, "Must be at least 2")
    .max(15, "Must be 15 or younger"),
});

export const adultSchema = z.object({
  name: z.string().trim().min(2, "Adult's full name required").max(80),
  age: z.coerce
    .number()
    .int("Age must be a whole number")
    .min(16, "Family Pass is for ages 16+"),
});

export const registrationSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name required").max(60),
    lastName: z.string().trim().min(1, "Last name required").max(60),
    address: z.string().trim().min(3, "Address required").max(120),
    city: z.string().trim().min(1, "City required").max(60),
    state: z.string().trim().length(2, "Use 2-letter state code"),
    zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Use a valid ZIP code"),

    children: z
      .array(childSchema)
      .min(1, "Add at least one child")
      .max(8, "Maximum 8 children"),

    adults: z.array(adultSchema).max(8, "Maximum 8 adults").default([]),

    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    confirmEmail: z.string().trim().toLowerCase(),
    password: z.string().min(6, "Password must be at least 6 characters").max(200),
    confirmPassword: z.string(),

    phone: z
      .string()
      .trim()
      .regex(
        /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
        "Use a 10-digit US phone number"
      )
      .optional()
      .or(z.literal("")),

    smsOptIn: z.boolean().default(false),
    termsAccepted: z.literal<boolean>(true, {
      message: "You must accept the Terms to register",
    }),
  })
  .refine((d) => d.email === d.confirmEmail, {
    message: "Emails do not match",
    path: ["confirmEmail"],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => !d.smsOptIn || (d.phone && d.phone.length > 0), {
    message: "Mobile phone is required for SMS alerts",
    path: ["phone"],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const addAdultsSchema = z.object({
  adults: z.array(adultSchema).min(1, "Add at least one adult").max(8),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}
