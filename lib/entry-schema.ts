import { z } from "zod";

export const MAX_ENTRY_LENGTH = 2000;

const isoTimestampSchema = z.string().refine((value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}, "timestamp must be a valid ISO datetime");

const latitudeSchema = z
  .number()
  .finite()
  .nullable()
  .refine(
    (value) => value === null || (value >= -90 && value <= 90),
    "latitude out of range",
  );

const longitudeSchema = z
  .number()
  .finite()
  .nullable()
  .refine(
    (value) => value === null || (value >= -180 && value <= 180),
    "longitude out of range",
  );

export const createEntrySchema = z.object({
  text: z.string().trim().min(1).max(MAX_ENTRY_LENGTH),
  timestamp: isoTimestampSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type CreateEntryPayload = z.infer<typeof createEntrySchema>;
