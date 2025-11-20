import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    user_id: v.string(),
    project_id: v.string(),
    project_name: v.optional(v.string()),
    project_description: v.optional(v.string()),
    project_visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    chat: v.optional(v.any())
  }).index("project_id", ["project_id"]).index("user_id", ["user_id"]),
});