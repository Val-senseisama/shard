import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import "../global.css"

type BlockButtonProps = {
  title: string;
  otherStyles?: string;
  onPress?: () => void;
  variant?: 'block' | 'outline';
};

const BlockButton = ({
  title, 
  otherStyles, 
  onPress, 
  variant = 'block' // Default to 'block' variant
}: BlockButtonProps) => {
  if (variant === 'outline') {
    return (
      <TouchableOpacity 
        className={`${otherStyles} border-2 border-primary bg-transparent rounded-xl h-12 justify-center items-center`}
        onPress={onPress}
        style={{ width: '100%', borderRadius: 12, height: 48 }}
      >
        <Text 
          style={{ 
            color: '#4135F3',
            fontSize: 16,
            fontFamily: 'Inter-SemiBold',
            textAlign: 'center'
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  // Default block variant
  return (
    <TouchableOpacity className={otherStyles} onPress={onPress}>
      <LinearGradient
        colors={['#4135F3', '#7168F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="h-12 rounded-xl justify-center items-center"
        style={{ width: '100%', borderRadius: 12, height: 48, elevation: 4 }}
      >
        <Text 
          style={{ 
            color: 'white', 
            fontSize: 16,
            fontFamily: 'Inter-SemiBold',
            textAlign: 'center'
          }}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default BlockButton