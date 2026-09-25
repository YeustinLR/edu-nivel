import { z } from "zod";

export const profileNameSchema = z
  .string({ error: "Escribe tu nombre." })
  .trim()
  .min(2, "Escribe un nombre de al menos 2 caracteres.")
  .max(100, "El nombre no puede superar 100 caracteres.");

