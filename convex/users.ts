import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Create a new task with the given text
export const createUser = mutation({
    args:{
        username:v.string(),
        fullname:v.string(),
        email:v.string(),
        bio:v.optional(v.string()),
        image:v.string(),
        clerkId:v.string()
    },
    handler: async(ctx,args) => {
        const existingUser = await ctx.db.query("users")
        .withIndex("by_clerkId",(q) => q.eq("clerkId",args.clerkId))
        .first()
        
        if(existingUser){
            return
        }

        await ctx.db.insert("users",{
            username:args.username,
            fullname:args.fullname,
            email:args.email,
            bio:args.bio,
            image:args.image,
            followers:0,
            following:0,
            posts:0,
            clerkId:args.clerkId
        })
    }
});

export async function getAuthenticatedUser(ctx:QueryCtx | MutationCtx){
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
    return userDoc
}

export const getUserByClerkId = query({
    args:{clerkId:v.string()},
    handler:async(ctx,args)=>{
        const user = await ctx.db.query("users")
            .withIndex("by_clerkId",(q)=>q.eq("clerkId",args.clerkId))
            .first()
        return user
    }
})

export const updateProfile = mutation({
    args:{
        fullname:v.string(),
        bio:v.optional(v.string()),
    },
    handler:async(ctx,args)=>{
        const currentUser = await getAuthenticatedUser(ctx)
        await ctx.db.patch(currentUser._id,{
            fullname:args.fullname,
            bio:args.bio
        })
    }
})


export const getUserProfile = query({
    args:{
        id:v.id("users")
    },
    handler: async(ctx,args) => {
        const user = await ctx.db.get(args.id)
        if(!user) throw new Error("User not found")
        return user
    }
})

export const isFollowing = query({
    args:{
        followingId:v.id("users")
    },
    handler: async(ctx,args) => {
        const currentUser=await getAuthenticatedUser(ctx)
        const follow = await ctx.db
        .query("follows")
        .withIndex("by_both", (q) => 
            q.eq("followerId",currentUser._id).eq("followingId",args.followingId)
        )
        .first()
        return !!follow
    }
})

export const toggleFollow = mutation({
    args:{
        followingId:v.id("users")
    },
    handler: async(ctx,args) => {
        const currentUser=await getAuthenticatedUser(ctx)
        const exixting = await ctx.db
        .query("follows")
        .withIndex("by_both", (q) =>
        q.eq("followerId",currentUser._id).eq("followingId",args.followingId))
        .first()
        if(exixting){
            await ctx.db.delete(exixting._id)
            await updateFollowCount(ctx,currentUser._id,args.followingId,false)
        }
        else{
            await ctx.db.insert("follows",{
                followerId:currentUser._id,
                followingId:args.followingId
            })
            await updateFollowCount(ctx,currentUser._id,args.followingId,true)

            await ctx.db.insert("notifications",{
                receiverId:args.followingId,
                senderId:currentUser._id,
                type:"follow",
            })
        }
    }
})

async function updateFollowCount(
    ctx:MutationCtx,
    followerId:Id<"users">,
    followingId:Id<"users">,
    isFollow:boolean
){
    const follower = await ctx.db.get(followerId)
    const following = await ctx.db.get(followingId)

    if(follower && following){
        await ctx.db.patch(followerId,{
            following:follower.following+(isFollow?1:-1)
        })
        await ctx.db.patch(followingId,{
            followers:following.followers+(isFollow?1:-1)
        })
    }
}
