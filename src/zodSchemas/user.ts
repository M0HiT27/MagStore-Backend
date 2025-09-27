import z from "zod";

export const signupSchema = z.object({
  email: z.email(),
  name: z.string().min(1, "Name is required").max(20 ,"Name can be of atmost 20 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(20 , "Password must be at most 20 characters"),
});

export const loginSchema = signupSchema.pick({
  email: true,
  password: true,
});