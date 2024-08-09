import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { useThemeContext } from '../ThemeProviderContext';

const DetailButton = ({ title, color }) => {
  const {theme} = useThemeContext()
  return (
    <TouchableOpacity
      style={{ backgroundColor: color }}
      className={` py-1 px-2 rounded-md my-2`}>
      <Text className="text-[10px] font-Iregular text-white">{title}</Text>
    </TouchableOpacity>
  );
}

export default DetailButton