import type { ErrorRequestHandler } from "express";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function validate<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue?.path.join(".");
  throw new HttpError(400, field ? `${field}: ${issue?.message}` : (issue?.message ?? "Invalid input."));
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "The body is not valid JSON." });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "The body is too large." });
    return;
  }
  const path = String(req.originalUrl).slice(0, 200).replace(/\n|\r/g, "");
  console.error("[%s %s]", req.method, path, err);
  res.status(500).json({ error: "Something went wrong." });
};
