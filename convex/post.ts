import { mutation, MutationCtx, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./users";
import { Id } from "./_generated/dataModel";


export const generateUploadURl = mutation(async(ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if(!identity){
        throw new Error('User is not authenticated')
    }  
    return  await ctx.storage.generateUploadUrl()
    
})

export const createPost = mutation({
    args:{
        caption:v.optional(v.string()),
        storageId:v.id("_storage"),
    },
    handler: async(ctx,args) => {
        const currentUser = await ctx.auth.getUserIdentity()
        if(!currentUser){
            throw new Error('User is not authenticated')
        }
        const userDoc = await ctx.db.query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", currentUser.subject))
            .first()
        if(!userDoc){
            throw new Error('User is not found')
        }

        const imageUrl = await ctx.storage.getUrl(args.storageId)
        if(!imageUrl){
            throw new Error('Image is not found')
        }

        const postId=await ctx.db.insert("posts",{
            userId:userDoc._id,
            imageUrl,
            storageId:args.storageId,
            caption:args.caption,
            likes:0,
            comments:0
        })

        await ctx.db.patch(userDoc._id,{
            posts:userDoc.posts + 1
        })

        return postId
    }
})

export const getFeedPosts=query({
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

        const posts = await ctx.db.query("posts").order("desc").collect()

        if(posts.length===0) return[]

        const postsWithInfo = await Promise.all(posts.map(async(post) => {
            const postAuthor = (await ctx.db.get(post.userId))!
            const like=await ctx.db
            .query("likes")
            .withIndex("by_user_and_post",(q)=>
                q.eq("userId",userDoc._id).eq("postId",post._id))
            .first()

            const bookmark=await ctx.db
            .query("bookmarks")
            .withIndex("by_user_and_post",(q)=>
                q.eq("userId",userDoc._id).eq("postId",post._id))
            .first()

            return{
                ...post,
                author:{
                    _id:postAuthor?._id,
                    username:postAuthor?.username,
                    image:postAuthor?.image
                },
                isLiked:!!like,
                isBookmarked:!!bookmark
            }
        }))

        return postsWithInfo
    }
})

export const toggleLike = mutation({
    args:{postId:v.id("posts")},
    handler: async(ctx,args) => {
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

        const existing=await ctx.db
        .query("likes")
        .withIndex("by_user_and_post",(q)=>
            q.eq("userId",userDoc._id).eq("postId",args.postId)
        )
        .first()

        const post=await ctx.db.get(args.postId)
        if(!post) throw new Error("Post not found")

        if(existing){
            await ctx.db.delete(existing._id)
            await ctx.db.patch(args.postId,{likes:post.likes-1})
            return false
        }
        else{
            await ctx.db.insert("likes",{
                userId:userDoc._id,
                postId:args.postId
            })
            await ctx.db.patch(args.postId,{likes:post.likes+1})

            if(userDoc._id !== post.userId){
                await ctx.db.insert("notifications",{
                    receiverId:post.userId,
                    senderId:userDoc._id,
                    type:"like",
                    postId:args.postId
                })
            }
            return true
        }
    }
})

export const deletePost = mutation({
    args:{postId:v.id("posts")},
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

        const post = await ctx.db.get(args.postId)
        if (!post) throw new Error("Post not found")

        if(post.userId !== userDoc._id) throw new Error("You can't delete this post")

        const likes = await ctx.db
            .query("likes")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect()

        for(const like of likes){
            await ctx.db.delete(like._id)
        }

        const comments = await ctx.db
            .query("comments")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect()

        for(const comment of comments){
            await ctx.db.delete(comment._id)
        }

        const bookmarks = await ctx.db
            .query("bookmarks")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect()

        for (const bookmark of bookmarks){
            await ctx.db.delete(bookmark._id)
        }

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_post", (q) => q.eq("postId", args.postId))
            .collect()

        for(const notification of notifications){
            await ctx.db.delete(notification._id)
        }

        await ctx.storage.delete(post.storageId)
        await ctx.db.delete(args.postId)

        await ctx.db.patch(userDoc._id,{
            posts: Math.max(0, (userDoc.posts || 1) - 1)
        })
    }
})

export const getPostByUser = query({
    args:{
        userId:v.optional(v.id("users"))
    },
    handler: async(ctx,args) => {
        const user = args.userId ? await ctx.db.get(args.userId) : await getAuthenticatedUser(ctx)

        if(!user) throw new Error("User not found")
        
        const posts = await ctx.db
        .query("posts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId || user._id))
        .collect()

        return posts
    }
})
