import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
