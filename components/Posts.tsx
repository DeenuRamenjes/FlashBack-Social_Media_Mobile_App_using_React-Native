import { View, Text, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { styles } from '@/styles/feed.styles'
import { Link } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/constants/theme'

import moment from 'moment';
import { Id } from '@/convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import CommentModel from './CommentModel'
import { useUser } from '@clerk/clerk-expo'

type PostProps = {
  post:{
    _id: Id<"posts">
    imageUrl: string
    caption?: string
    likes: number
    comments: number
    _creationTime: number
    isLiked: boolean
    isBookmarked: boolean
    author: {
      _id: string
      username: string
      image: string
    }
  }
}

export default function Posts({post}:PostProps) {

  const [isLiked,setIsLiked]=useState(post.isLiked)

  const [showComment,setShowComment]=useState(false)

  const [IsBookmarked,setIsBookmarked]=useState(post.isBookmarked)
  
  const formattedTime = moment(post._creationTime).fromNow();

  const toggleLike=useMutation(api.post.toggleLike)

  const deletePost=useMutation(api.post.deletePost)

  const togggleBookmark =useMutation(api.bookmarks.toggleBookmark)

  const {user}=useUser()
  const currentUser=useQuery(api.users.getUserByClerkId,user ? {clerkId:user.id}:"skip")

  const handleLike = async()=>{
    try {
      const newIsLiked=await toggleLike({postId:post._id})
      setIsLiked(newIsLiked)
    } catch (error) {
      console.error("Error toggling like",error)
    }
  }

  const handleBookmark=async()=>{
    const newIsBookmarked=await togggleBookmark({postId:post._id})
    setIsBookmarked(newIsBookmarked)
  }

  const handleDelete=async()=>{
    try {
      await deletePost({postId:post._id})
    } catch (error) {
      console.error("Error deleting post",error)
    }
  }

  return (
    <View style={styles.post}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Link href={{ pathname: currentUser?._id === post.author._id ? "/(tabs)/profile" : "/user/[id]", params: { id: post.author._id } }} asChild>
          <TouchableOpacity style={styles.postHeaderLeft}>
            <Image
              source={post.author.image}
              style={styles.postAvatar}
              contentFit='cover'
              transition={200}
              cachePolicy="memory-disk"
            />
            <Text style={styles.postUsername}>{post.author.username}</Text>
          </TouchableOpacity>
        </Link>
        {currentUser?._id === post.author._id ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name='trash-outline' size={20} color={COLORS.primary}/>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity>
            <Ionicons name='ellipsis-horizontal' size={20} color={COLORS.white}/>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Image */}
      <Image
        source={post.imageUrl}
        style={styles.postImage}
        contentFit='cover'
        transition={200}
        cachePolicy="memory-disk"
      />

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={handleLike}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? COLORS.primary : COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowComment(true)}>
            <Ionicons name='chatbubble-outline' size={22} color={COLORS.white}/>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleBookmark}>
          <Ionicons name={IsBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={COLORS.white}/>
        </TouchableOpacity>
      </View>

      {/* Post Info */}
      <View style={styles.postInfo}>
        <Text style={styles.likesText}>{post.likes} likes</Text>
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionUsername}>{post.author.username}</Text>
            <Text style={styles.captionText}>{post.caption}</Text>
          </View>
        )}
        {post.comments > 0 && (
          <TouchableOpacity onPress={() => setShowComment(true)}>
            <Text style={styles.commentText}>
              {post.comments === 0 ? "No comments yet" : `View ${post.comments} Comments`}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.timeAgo}>{formattedTime}</Text>
      </View>

      <CommentModel
        postId={post._id}
        visible={showComment}
        onClose={() => setShowComment(false)}
      />
    </View>
  )
}