import { query } from "./_generated/server";
import { v } from "convex/values";

export const getNotifications = query({
    handler: async(ctx) => {
        const currentUser = await ctx.auth.getUserIdentity()
        if (!currentUser) {
            throw new Error("User is not authenticated")
        }
        const userDoc = await ctx.db.query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", currentUser.subject))
            .first()
        
        if (!userDoc) {
            throw new Error("User not found")
        }

        const notifications = await ctx.db.query("notifications")
            .withIndex("by_receiver", (q) => q.eq("receiverId", userDoc._id))
            .order("desc")
            .collect()

        const notificationsWithInfo = await Promise.all(
            notifications.map(async (notification) => {
                const sender = await ctx.db.get(notification.senderId)
                let post = null
                let comment = null

                if(notification.postId){
                    post = await ctx.db.get(notification.postId)
                    if(!post) return null
                }
                if(notification.type === "comment" && notification.CommentId){
                    comment = await ctx.db.get(notification.CommentId)
                    if(!comment) return null
                }
                if(!sender) return null

                return {
                    ...notification,
                    sender: {
                        _id: sender._id,
                        username: sender.username,
                        image: sender.image
                    },
                    post,
                    comment: comment?.content
                }
            })
        )

        return notificationsWithInfo.filter(notification => notification !== null)
    }
})