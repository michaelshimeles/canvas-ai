import { v } from "convex/values";
import { v0 } from 'v0-sdk';
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";

export const startCodeGen = mutation({
    args: { prompt: v.string(), project_id: v.string() },
    handler: async (ctx, args) => {
        await ctx.scheduler.runAfter(0, internal.generate.generateCode, {
            prompt: args.prompt,
            project_id: args.project_id
        });
    },
});

export const generateCode = internalAction({
    args: {
        prompt: v.any(),
        project_id: v.string()
    },
    handler: async (ctx, args) => {
        // Create a new chat
        const chat = await v0.chats.create({
            message: args.prompt,
            system: 'You are an expert React developer',
            modelConfiguration: {
                modelId: 'v0-1.5-md',
                imageGenerations: false,
            },
        })

        await ctx.runMutation(internal.generate.insertProject, {
            chat,
            project_id: args.project_id
        })
    },
});

export const insertProject = internalMutation({
    args: {
        chat: v.any(),
        project_id: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthorized");
        }
        await ctx.db.insert("projects", {
            user_id: user.subject,
            chat: args.chat,
            project_id: args.project_id
        });
    }
})

export const listScheduledMessages = query({
    args: {},
    handler: async (ctx, args) => {
        return await ctx.db.system.query("_scheduled_functions").collect();
    },
});

export const getScheduledMessage = query({
    args: {
        id: v.id("_scheduled_functions"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.system.get(args.id);
    },
});

export const getProjectById = query({
    args: {
        project_id: v.string()
    },
    handler: async (ctx, args) => {
        return ctx.db.query("projects").withIndex("project_id", (q) => q.eq("project_id", args.project_id)).first()
    }
})

export const getAllProjects = query({
    args: {},
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthorized");
        }
        return ctx.db.query("projects").withIndex("user_id", (q) => q.eq("user_id", user.subject)).collect()
    }
})

export const continueChat = action({
    args: {
        chat_id: v.string(),
        prompt: v.string(),
        project_id: v.string()
    },
    handler: async (ctx, args) => {

        const response = await v0.chats.create({
            projectId: args.chat_id,
            message: args.prompt,
        })

        const chat = await v0.chats.getById({ chatId: args.chat_id })

        // Update the project in the database
        await ctx.runMutation(internal.generate.updateProject, {
            chat,
            project_id: args.project_id,
        })

        return {
            chat,
            response
        }
    }
})

export const updateProject = internalMutation({
    args: {
        chat: v.any(),
        project_id: v.string(),
        project_name: v.optional(v.string()),
        project_description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("projects")
            .withIndex("project_id", (q) => q.eq("project_id", args.project_id))
            .first();
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new Error("Unauthorized");
        }
        if (existing) {
            await ctx.db.patch(existing._id, {
                chat: args.chat,
                project_id: args.project_id
            });
        } else {
            await ctx.db.insert("projects", {
                user_id: user.subject,
                chat: args.chat,
                project_id: args.project_id,
                project_name: args.project_name,
                project_description: args.project_description,
                project_visibility: "private",
            });
        }
    }
})

export const createProject = mutation({
    args: {
        project_id: v.string(),
        project_name: v.string(),
        project_description: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthorized");
        }
        const project = await ctx.db.insert("projects", {
            user_id: user.subject,
            project_name: args.project_name,
            project_description: args.project_description,
            project_visibility: "private",
            project_id: args.project_id,
            chat: null,
        })
        return project;
    }
})