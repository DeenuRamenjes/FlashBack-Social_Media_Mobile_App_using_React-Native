import Loader from "@/components/Loader";
import Posts from "@/components/Posts";
import Stories from "@/components/Stories";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/feed.styles";
import { useState } from "react";


export default function Index() {
  const {signOut}=useAuth()

  const [ refreshing,setRefreshing ] = useState(false)

  const posts=useQuery(api.post.getFeedPosts)

  if(posts===undefined) return <Loader/>

  if(posts.length===0) return <NoPostFound/>

  // const onRefresh=()=>{
  //   setRefreshing(true)
  //   setTimeout(()=>{
  //     setRefreshing(false)
  //   },2000)
  // }

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FlashBack</Text>
        <TouchableOpacity onPress={()=>signOut()}>
          <Ionicons name='log-out-outline' size={24} color={COLORS.white}/>
        </TouchableOpacity>
      </View>

      {/* <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{paddingBottom:60}}
      >
        {posts.map((post)=>(
          <Posts key={post._id} post={post}/>
        ))}
      </ScrollView> */}

        <FlatList
         data={posts}
         renderItem={({item})=><Posts post={item}/>}
         keyExtractor={(item)=> item._id}
         showsVerticalScrollIndicator={false}
         contentContainerStyle={{paddingBottom:60}}
         ListHeaderComponent={<Stories/>}
         refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
         }
        />

    </View>
  );
}


function NoPostFound() {
  const {signOut}=useAuth()
  return (
  
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FlashBack</Text>
        <TouchableOpacity onPress={()=>signOut()}>
          <Ionicons name='log-out-outline' size={24} color={COLORS.white}/>
        </TouchableOpacity>
      </View>
    <Stories/>
      <View style={{
        flex:2,
        alignItems:'center',

      }}>
      <Ionicons name='logo-tableau' size={48} color={COLORS.primary}/>
      <Text style={{fontSize:20,color:COLORS.primary}}>No Post Yet</Text>
    </View>
  </View>
)}