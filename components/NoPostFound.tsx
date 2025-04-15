import { COLORS } from '@/constants/theme'
import { styles } from '@/styles/profile.styles'
import { Ionicons } from '@expo/vector-icons'
import React, { Component } from 'react'
import { Text, View } from 'react-native'

export default class NoPostFound extends Component {
  render() {
    return (
      <View style={{
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background
      }}>
        <Ionicons name='image-outline' size={48} color={COLORS.primary}/>
        <Text style={{
            fontSize: 20,
            color: COLORS.primary,
        }}> No Posts Found </Text>
      </View>
    )
  }
}
