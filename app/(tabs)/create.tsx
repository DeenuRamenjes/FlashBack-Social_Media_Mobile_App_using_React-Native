import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TextInput} from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { styles } from '@/styles/create.styles';
import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system'
import {Image} from 'expo-image'
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';



export default function Create() {
  const router = useRouter();
  const {user}=useUser()

  const [caption,setCaption]=useState("")
  const [selectedImage,setSelectedImage]=useState<string|null>(null)
  const [isSharing,setIsSharing]=useState(false)

  const pickImage=async()=>{
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:"images",
        allowsEditing:true,
        aspect:[1,1],
        quality:0.8
      })
      if(!result.canceled){
        console.log("Selected Image URI:", result.assets[0].uri);
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  }

  const generateUploadUrl=useMutation(api.post.generateUploadURl)
  const createPost=useMutation(api.post.createPost)

  const handleShare=async()=>{
    if(!selectedImage) return
    try {
      setIsSharing(true)
      const uploadUrl=await generateUploadUrl()

      let storageId;
      if (Platform.OS === 'web') {
        // For web platform
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'image/jpeg',
          },
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload image');
        const { storageId: id } = await uploadResponse.json();
        storageId = id;
      } else {
        // For mobile platforms
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, selectedImage, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          mimeType: "image/jpeg"
        });
        if (uploadResult.status !== 200) throw new Error("Failed to upload image");
        const { storageId: id } = JSON.parse(uploadResult.body);
        storageId = id;
      }

      await createPost({storageId, caption})
      setSelectedImage(null)
      setCaption("")
      router.push("/(tabs)")
    } catch (error) {
      console.error("Error sharing post:", error);
    } finally {
      setIsSharing(false)
    }
  }
  if(!selectedImage){
    return(
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name='arrow-back' size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={{width: 28}}/>
        </View>
        <TouchableOpacity style={styles.emptyImageContainer} onPress={pickImage}>
          <Ionicons name='image-outline' size={48} color={COLORS.grey} />
          <Text style={styles.emptyImageText}>Tap to add a image</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.container}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              setSelectedImage(null)
              setCaption("")
            }}
            disabled={isSharing}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <Ionicons name='close-outline' size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity 
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.shareText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, isSharing && styles.contentDisabled]}>
            <View style={styles.imageSection}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
                disabled={isSharing}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <Ionicons name='image-outline' size={20} color={COLORS.white} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputSection}>
              <View style={styles.captionContainer}>
                <Image
                  source={{ uri: user?.imageUrl }}
                  style={styles.userAvatar}
                  contentFit='cover'
                  transition={200}
                />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  value={caption}
                  onChangeText={(text) => setCaption(text)}
                  editable={!isSharing}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}