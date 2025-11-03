import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    project_id: v.string(),
    chat: v.any()
  }).index("project_id", ["project_id"]),
});