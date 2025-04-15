import { View, Text, Modal, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList, TextInput } from 'react-native'
import React from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { styles } from '@/styles/feed.styles'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/constants/theme'
import Loader from './Loader'
import Comment from './Comment'

type CommentModel={
    postId:Id<"posts">
    visible:boolean
    onClose:()=>void
}

export default function CommentModel({postId,visible,onClose}:CommentModel) {
    const [newComment, setNewComment] = useState("")
    const comments=useQuery(api.comments.getComment,{postId})
    const addComment= useMutation(api.comments.addComment)

    const handleAddComment=async()=>{
        if(!newComment.trim()) return
        try {
            await addComment({
                content:newComment,
                post_id:postId,
            })
            setNewComment("")
        } catch (error) {
            console.error("Error adding comment:", error)
        }
    }

    return (
        <Modal visible={visible} animationType='slide' transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? "padding" : "height"}
            style={styles.modalContainer}
            >
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name='close' size={24} color={COLORS.white}/>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Comments</Text>
                    <View style={{width:24}}/>
                </View>
                {comments === undefined ? (
                    <Loader/>
                ):( 
                    <FlatList
                        data={comments}
                        keyExtractor={item => item._id}
                        renderItem={({item})=><Comment comment={item}/>}
                        contentContainerStyle={styles.container}
                    />
                )}
                <View style={styles.commentInput}>
                    <TextInput
                        style={styles.input}
                        placeholder='Add a comment...'
                        placeholderTextColor={COLORS.grey}
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={handleAddComment} 
                        disabled={!newComment.trim()}
                    >
                        <Text style={[styles.postButton, !newComment.trim() && styles.postButtonDisabled]}>
                            Post
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}