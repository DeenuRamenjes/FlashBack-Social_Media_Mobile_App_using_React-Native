import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addComment = mutation({
    args:{
        content:v.string(),
        post_id:v.id("posts"),
    },
    handler:async(ctx,args)=>{
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

        const post = await ctx.db.get(args.post_id)
        if(!post) throw new Error("Post not found")

        const commentId = await ctx.db.insert("comments",{
            userId:userDoc._id,
            postId:args.post_id,
            content:args.content,
        })

        await ctx.db.patch(args.post_id,{ comments:post.comments + 1})

        if(post.userId !== userDoc._id) {
            await ctx.db.insert("notifications", {
                receiverId:post.userId,
                senderId:userDoc._id,
                type: "comment",
                postId: args.post_id,
                CommentId: commentId
            })
        }
        return commentId
    }
})


export const getComment = query({
    args: {
        postId:v.id("posts")
    },
    handler:async(ctx,args)=>{
        const comments=await ctx.db.query("comments")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .collect()

        const commentsWithInfo = await Promise.all
        (comments.map(async (comment) => {
            const user = await ctx.db.get(comment.userId)
            return{
                ...comment,
                user:{
                    fullname:user!.fullname,
                    image:user!.image
                }
            }
        }))
        return commentsWithInfo
    }
})