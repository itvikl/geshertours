import * as z from "zod";

/**
 * Zod's built-in messages ("expected number", "too small"…) in Hebrew, for
 * any rule without its own message. Imported for its side effect by every
 * schema file, so it runs wherever a schema is used (server or browser).
 */
z.config(z.locales.he());
