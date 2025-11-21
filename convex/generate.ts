import { v } from "convex/values";
import { v0 } from 'v0-sdk';
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";

export const startCodeGen = mutation({
    args: { prompt: v.string(), project_id: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthorized");
        }

        console.log("args", args)
        await ctx.scheduler.runAfter(0, internal.generate.generateCode, {
            user_id: user.subject,
            prompt: args.prompt,
            project_id: args.project_id
        });
    },
});

export const generateCode = internalAction({
    args: {
        user_id: v.string(),
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

        // console.log("chat", chat)
        await ctx.runMutation(internal.generate.updateProject, {
            user_id: args.user_id,
            chat: "hi",
            project_id: args.project_id
        })
    },
});


export const updateProject = internalMutation({
    args: {
        user_id: v.string(),
        chat: v.any(),
        project_id: v.string()
    },
    handler: async (ctx, args) => {

        const project = await ctx.db.query("projects").withIndex("project_id", (q) => q.eq("project_id", args.project_id)).first()

        console.log("project", project)

        if (project) {
            await ctx.db.patch(project._id, {
                chat: args.chat,
            });

            return project
        }

        throw new Error("Project not found");
    }
})

export const continueChat = action({
    args: {
        chat_id: v.string(),
        prompt: v.string(),
        project_id: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const response = await v0.chats.create({
            projectId: args.chat_id,
            message: args.prompt,
        })

        const chat = await v0.chats.getById({ chatId: args.chat_id })

        // Update the project in the database
        await ctx.runMutation(internal.generate.updateProject, {
            project_id: args.project_id,
            chat,
            user_id: user.subject,
        })

        return {
            chat,
            response
        }
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