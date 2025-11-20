import { v } from "convex/values";
import { mutation } from "./_generated/server";


export const createCanvas = mutation({
    args: {
        project_id: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        console.log("user", user);
        if (!user) {
            throw new Error("Unauthorized");
        }
        const response = ctx.db.insert("projects", {
            user_id: user.subject,
            project_id: args.project_id,
            chat: null
        })

        return response;
    }
})