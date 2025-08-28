import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { inferNameFromEmail } from "./utils";

// Get next Thursday's date
function getNextThursday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  const nextThursday = new Date(today);
  
  if (daysUntilThursday === 0 && today.getHours() >= 17) {
    // If it's Thursday after 5 PM, get next Thursday
    nextThursday.setDate(today.getDate() + 7);
  } else if (daysUntilThursday === 0) {
    // If it's Thursday before 5 PM, use today
    nextThursday.setDate(today.getDate());
  } else {
    nextThursday.setDate(today.getDate() + daysUntilThursday);
  }
  
  return nextThursday.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Check if user is admin
async function isUserAdmin(ctx: any, userEmail: string): Promise<boolean> {
  const adminRecord = await ctx.db
    .query("admins")
    .withIndex("by_email", (q: any) => q.eq("email", userEmail))
    .first();
  return !!adminRecord;
}

// Check if a week is inactive
async function isWeekInactive(ctx: any, meetingDate: string): Promise<{ isInactive: boolean; reason?: string }> {
  const inactiveWeek = await ctx.db
    .query("inactiveWeeks")
    .withIndex("by_meeting_date", (q: any) => q.eq("meetingDate", meetingDate))
    .first();
  
  return {
    isInactive: !!inactiveWeek,
    reason: inactiveWeek?.reason
  };
}

export const getUpcomingMeeting = query({
  args: {},
  handler: async (ctx) => {
    const nextThursday = getNextThursday();
    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", nextThursday))
      .collect();
    
    // Get recording for this date
    const recording = await ctx.db
      .query("recordings")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", nextThursday))
      .first();
    
    // Check if week is inactive
    const inactiveStatus = await isWeekInactive(ctx, nextThursday);
    
    return {
      date: nextThursday,
      formattedDate: formatDate(nextThursday),
      presentations: presentations.sort((a, b) => a.signupTime - b.signupTime),
      recordingUrl: recording?.recordingUrl || null,
      isInactive: inactiveStatus.isInactive,
      inactiveReason: inactiveStatus.reason,
    };
  },
});

export const getPresentationsByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.date))
      .collect();
    
    // Get recording for this date
    const recording = await ctx.db
      .query("recordings")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.date))
      .first();
    
    // Check if week is inactive
    const inactiveStatus = await isWeekInactive(ctx, args.date);
    
    return {
      date: args.date,
      formattedDate: formatDate(args.date),
      presentations: presentations.sort((a, b) => a.signupTime - b.signupTime),
      recordingUrl: recording?.recordingUrl || null,
      isInactive: inactiveStatus.isInactive,
      inactiveReason: inactiveStatus.reason,
    };
  },
});

export const checkAdminStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAdmin: false };
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      return { isAdmin: false };
    }
    
    const isAdmin = await isUserAdmin(ctx, user.email);
    return { isAdmin };
  },
});

export const signUpToPresent = mutation({
  args: {
    title: v.string(),
    meetingDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to sign up");
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (user.isAnonymous) {
      throw new Error("Anonymous users cannot sign up to present");
    }
    
    const meetingDate = args.meetingDate || getNextThursday();
    
    // Check if week is inactive
    const inactiveStatus = await isWeekInactive(ctx, meetingDate);
    if (inactiveStatus.isInactive) {
      throw new Error(`This week is inactive and signups are not allowed. ${inactiveStatus.reason ? `Reason: ${inactiveStatus.reason}` : ''}`);
    }
    
    // Check if user already signed up for this meeting
    const existingSignup = await ctx.db
      .query("presentations")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", meetingDate))
      .filter((q) => q.eq(q.field("presenterEmail"), user.email))
      .first();
    
    if (existingSignup) {
      throw new Error("You have already signed up for this meeting");
    }
    
    await ctx.db.insert("presentations", {
      title: args.title.trim(),
      presenterName: (user.name as string | undefined) || inferNameFromEmail(user.email as string | undefined) || (user.email as string | undefined) || "Anonymous",
      presenterEmail: (user.email as string | undefined) || "",
      meetingDate,
      signupTime: Date.now(),
    });
    
    return { success: true };
  },
});

export const editPresentation = mutation({
  args: {
    presentationId: v.id("presentations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to edit presentation");
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (user.isAnonymous) {
      throw new Error("Anonymous users cannot edit presentations");
    }
    
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }
    
    // Check if week is inactive (only allow admins to edit during inactive weeks)
    const inactiveStatus = await isWeekInactive(ctx, presentation.meetingDate);
    const isAdmin = user.email ? await isUserAdmin(ctx, user.email) : false;
    
    if (inactiveStatus.isInactive && !isAdmin) {
      throw new Error("This week is inactive and presentations cannot be edited");
    }
    
    // Check if user is the presenter or an admin
    if (presentation.presenterEmail !== user.email && !isAdmin) {
      throw new Error("You can only edit your own presentations");
    }
    
    await ctx.db.patch(args.presentationId, {
      title: args.title.trim(),
    });
    
    return { success: true };
  },
});

export const deletePresentation = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to delete presentation");
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (user.isAnonymous) {
      throw new Error("Anonymous users cannot delete presentations");
    }
    
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }
    
    // Check if week is inactive (only allow admins to delete during inactive weeks)
    const inactiveStatus = await isWeekInactive(ctx, presentation.meetingDate);
    const isAdmin = user.email ? await isUserAdmin(ctx, user.email) : false;
    
    if (inactiveStatus.isInactive && !isAdmin) {
      throw new Error("This week is inactive and presentations cannot be deleted");
    }
    
    // Check if user is the presenter or an admin
    if (presentation.presenterEmail !== user.email && !isAdmin) {
      throw new Error("You can only delete your own presentations");
    }
    
    await ctx.db.delete(args.presentationId);
    
    return { success: true };
  },
});

export const addRecordingLink = mutation({
  args: {
    meetingDate: v.string(),
    recordingUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add recording link");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can add recording links");
    }
    
    // Check if recording already exists for this date
    const existingRecording = await ctx.db
      .query("recordings")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.meetingDate))
      .first();
    
    if (existingRecording) {
      // Update existing recording
      await ctx.db.patch(existingRecording._id, {
        recordingUrl: args.recordingUrl.trim(),
        addedBy: user.email,
        addedAt: Date.now(),
      });
    } else {
      // Create new recording
      await ctx.db.insert("recordings", {
        meetingDate: args.meetingDate,
        recordingUrl: args.recordingUrl.trim(),
        addedBy: user.email,
        addedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

export const removeRecordingLink = mutation({
  args: {
    meetingDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to remove recording link");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can remove recording links");
    }
    
    const recording = await ctx.db
      .query("recordings")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.meetingDate))
      .first();
    
    if (!recording) {
      throw new Error("No recording found for this date");
    }
    
    await ctx.db.delete(recording._id);
    
    return { success: true };
  },
});

export const markWeekInactive = mutation({
  args: {
    meetingDate: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to mark week as inactive");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can mark weeks as inactive");
    }
    
    // Check if week is already inactive
    const existingInactive = await ctx.db
      .query("inactiveWeeks")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.meetingDate))
      .first();
    
    if (existingInactive) {
      // Update existing inactive week
      await ctx.db.patch(existingInactive._id, {
        reason: args.reason?.trim() || undefined,
        markedBy: user.email,
        markedAt: Date.now(),
      });
    } else {
      // Create new inactive week
      await ctx.db.insert("inactiveWeeks", {
        meetingDate: args.meetingDate,
        reason: args.reason?.trim() || undefined,
        markedBy: user.email,
        markedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

export const markWeekActive = mutation({
  args: {
    meetingDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to mark week as active");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can mark weeks as active");
    }
    
    const inactiveWeek = await ctx.db
      .query("inactiveWeeks")
      .withIndex("by_meeting_date", (q) => q.eq("meetingDate", args.meetingDate))
      .first();
    
    if (!inactiveWeek) {
      throw new Error("Week is not marked as inactive");
    }
    
    await ctx.db.delete(inactiveWeek._id);
    
    return { success: true };
  },
});

export const addAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add admin");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can add other admins");
    }
    
    // Check if email is already an admin
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingAdmin) {
      throw new Error("User is already an admin");
    }
    
    await ctx.db.insert("admins", {
      email: args.email.toLowerCase().trim(),
      addedBy: user.email,
      addedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const removeAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to remove admin");
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User not found");
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      throw new Error("Only admins can remove other admins");
    }
    
    // Prevent removing yourself
    if (args.email.toLowerCase() === user.email.toLowerCase()) {
      throw new Error("You cannot remove yourself as admin");
    }
    
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!adminRecord) {
      throw new Error("User is not an admin");
    }
    
    await ctx.db.delete(adminRecord._id);
    
    return { success: true };
  },
});

export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      return [];
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await isUserAdmin(ctx, user.email);
    if (!isCurrentUserAdmin) {
      return [];
    }
    
    const admins = await ctx.db.query("admins").collect();
    return admins.sort((a, b) => a.addedAt - b.addedAt);
  },
});

export const getAvailableWeeks = query({
  args: {},
  handler: async (ctx) => {
    const weeks = [];
    const today = new Date();
    
    // Get all presentation dates to find the earliest one
    const allPresentations = await ctx.db.query("presentations").collect();
    const presentationDates = allPresentations.map(p => p.meetingDate);
    
    // Get all inactive weeks
    const inactiveWeeks = await ctx.db.query("inactiveWeeks").collect();
    const inactiveWeekMap = new Map(inactiveWeeks.map(w => [w.meetingDate, w]));
    
    let earliestDate: Date | null = null;
    if (presentationDates.length > 0) {
      const earliestDateString = presentationDates.sort()[0];
      earliestDate = new Date(earliestDateString + 'T00:00:00');
    }
    
    // Get next 8 Thursdays (future weeks)
    for (let i = 0; i < 8; i++) {
      const thursday = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
      
      if (i === 0 && daysUntilThursday === 0 && today.getHours() >= 17) {
        thursday.setDate(today.getDate() + 7);
      } else if (i === 0 && daysUntilThursday === 0) {
        thursday.setDate(today.getDate());
      } else if (i === 0) {
        thursday.setDate(today.getDate() + daysUntilThursday);
      } else {
        thursday.setDate(today.getDate() + daysUntilThursday + (i * 7));
      }
      
      const dateString = thursday.toISOString().split('T')[0];
      const inactiveWeek = inactiveWeekMap.get(dateString);
      
      weeks.push({
        date: dateString,
        formattedDate: formatDate(dateString),
        isPast: false,
        isCurrent: i === 0,
        isInactive: !!inactiveWeek,
        inactiveReason: inactiveWeek?.reason,
      });
    }
    
    // Get past Thursdays with presentations
    if (earliestDate) {
      const pastWeeks = [];
      let currentThursday = new Date(today);
      
      // Find this week's Thursday
      const dayOfWeek = today.getDay();
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
      if (daysUntilThursday === 0) {
        // Today is Thursday, use today
        currentThursday = new Date(today);
      } else {
        // Go to this week's Thursday
        currentThursday.setDate(today.getDate() + daysUntilThursday);
      }
      
      // Go back week by week until we reach the earliest presentation date
      let weekThursday = new Date(currentThursday);
      weekThursday.setDate(currentThursday.getDate() - 7);
      
      while (weekThursday >= earliestDate) {
        const dateString = weekThursday.toISOString().split('T')[0];
        
        // Check if this week has any presentations
        const weekPresentations = allPresentations.filter(p => p.meetingDate === dateString);
        const inactiveWeek = inactiveWeekMap.get(dateString);
        
        if (weekPresentations.length > 0 || inactiveWeek) {
          pastWeeks.unshift({
            date: dateString,
            formattedDate: formatDate(dateString),
            isPast: true,
            isCurrent: false,
            isInactive: !!inactiveWeek,
            inactiveReason: inactiveWeek?.reason,
          });
        }
        
        weekThursday.setDate(weekThursday.getDate() - 7);
      }
      
      // Add past weeks to the beginning of the array
      weeks.unshift(...pastWeeks);
    }
    
    return weeks;
  },
});
