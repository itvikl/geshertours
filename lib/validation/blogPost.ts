import * as z from "zod";
import "@/lib/validation/zodLocale";

/** Mirrors lib/types.ts BlogPost, minus postId (assigned by the data layer). */
export const BlogPostInputSchema = z.object({
  slug: z
    .string()
    .min(1, { error: "יש למלא כתובת (slug)." })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      error: "הכתובת חייבת להיות באותיות אנגליות קטנות, מופרדות במקפים (למשל kosher-passover-tips).",
    }),
  title: z.string().min(1, { error: "יש למלא כותרת." }),
  body: z.string().min(1, { error: "יש למלא תוכן." }),
  heroImage: z.string().optional(),
  tags: z.array(z.string()),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export type BlogPostInput = z.infer<typeof BlogPostInputSchema>;
