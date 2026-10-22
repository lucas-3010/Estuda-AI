import { z } from "zod";
import { LEVELS } from "@/lib/validation/plan";

/** Cookie que leva a pessoa de volta ao baralho compartilhado depois do login. */
export const AFTER_LOGIN_COOKIE = "estuda_depois_login";
export const SHARE_PATH = /^\/b\/[A-Za-z0-9_-]{16,64}$/;

export const sharedPlanSchema = z.object({
  topic: z.string(),
  level: z.enum(LEVELS),
  steps: z.array(
    z.object({
      title: z.string(),
      goal: z.string(),
      cards: z.array(z.object({ front: z.string(), back: z.string() })),
    }),
  ),
});
export type SharedPlan = z.infer<typeof sharedPlanSchema>;

/** Código aleatório de 22 caracteres (128 bits) para o link público. */
export function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}/b/${token}`;
}
