import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { useThemeContext } from '../ThemeProviderContext';

const DetailButton = ({ title, color, textColor, moreStyles, shadow }) => {
  const { theme } = useThemeContext();
  const shadowStyles = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 10, // for Android
  };
  return (
    <TouchableOpacity
      style={[{ backgroundColor: color }, shadow && shadowStyles]}
      className={` py-1 ${moreStyles || "px-2"} rounded-md my-2`}>
      <Text
        className={`text-[10px] font-Iregular ${textColor || "text-white"}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default DetailButton