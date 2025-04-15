import { v } from "convex/values";
import { getAuthenticatedUser } from "./users";
import { mutation, query } from "./_generated/server";

export const toggleBookmark = mutation({
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

        const existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_and_post",(q)=>
            q.eq("userId",userDoc._id).eq("postId",args.postId)
        )
        .first()

        if(existing){
            await ctx.db.delete(existing._id)
            return false
        }
        else{
            await ctx.db.insert("bookmarks",{
                userId:userDoc._id,
                postId:args.postId
            })
            return true
        }
    }
})

export const getBookmarkedPosts = query({
    handler:async(ctx)=>{
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

        const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user",(q)=>q.eq("userId",userDoc._id))
        .order("desc")
        .collect()

        const bookmarksWithInfo = await Promise.all(
            bookmarks.map(async(bookmark)=>{
                const post = await ctx.db.get(bookmark.postId)
                return post
            })
        )
        return bookmarksWithInfo
    }
})