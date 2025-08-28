import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  presentations: defineTable({
    title: v.string(),
    presenterName: v.string(),
    presenterEmail: v.string(),
    meetingDate: v.string(), // YYYY-MM-DD format
    signupTime: v.number(),
  }).index("by_meeting_date", ["meetingDate"]),
  
  admins: defineTable({
    email: v.string(),
    addedBy: v.string(),
    addedAt: v.number(),
  }).index("by_email", ["email"]),

  recordings: defineTable({
    meetingDate: v.string(), // YYYY-MM-DD format
    recordingUrl: v.string(),
    addedBy: v.string(),
    addedAt: v.number(),
  }).index("by_meeting_date", ["meetingDate"]),

  inactiveWeeks: defineTable({
    meetingDate: v.string(), // YYYY-MM-DD format
    reason: v.optional(v.string()),
    markedBy: v.string(),
    markedAt: v.number(),
  }).index("by_meeting_date", ["meetingDate"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
