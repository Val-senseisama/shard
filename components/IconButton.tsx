import React from 'react'
import { Image, ImageSourcePropType, Platform, Text, TouchableOpacity, View } from 'react-native'
import "../global.css"

const IconButton = ({src, otherStyles, text}: {src: ImageSourcePropType, otherStyles?: string, text?: string}) => {
  return (
    <TouchableOpacity >
      <View
        style={[
          { 
            height: 48,
            borderRadius: 12,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            backgroundColor: 'white',
          },
          Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
          })
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Image 
            source={src}
            style={{ width: 16, height: 16 }}
            resizeMode="contain"
          />
          {text && (
            <Text style={{ marginLeft: 8, fontSize: 14, fontFamily: 'iregular', color: '#000' }}>
              {text}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default IconButton