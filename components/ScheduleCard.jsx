import { View, Text, Image } from 'react-native'
import React from 'react'
import DetailButton from './DetailButton'
import icons from '../constants/icons'
import { useThemeContext } from '../ThemeProviderContext'

const ScheduleCard = () => {
  const {theme} = useThemeContext()
  return (
    <View
    style={{backgroundColor: theme.colors.secondary}}
      className="p-4 min-w-[98%] rounded-2xl border-l-[25px] border-l-[#4135F3] my-2">
      <View>
        <Text style={{color: theme.colors.text}} className="text-base font-Iregular text-center">
          Set up Research environment
        </Text>
      </View>
      <View className="flex-row items-center justify-evenly">
        <Image source={icons.clock}
        style={{tintColor: theme.colors.text}}
        />
        <DetailButton title="02:00 PM" color="#7168F6" />
        <Text
        style={{color: theme.colors.text}}
        >To</Text>
        <DetailButton title="03:30 PM" color="#CE7DF5" />
      </View>

      <View>
        <View className="flex-row items-center my-2">
          <Image source={icons.check} />
          <Text
          style={{color: theme.colors.text}}
            className="text-xs font-Iregular px-2">
            Download and setup MS Word
          </Text>
        </View>

        <View className="flex-row items-center my-2">
          <Image source={icons.uncheck} />
          <Text
          style={{color: theme.colors.text}}
            className="text-xs font-Iregular px-2">
            Use google scholar to find works
          </Text>
        </View>

        <View className="flex-row items-center my-2">
          <Image source={icons.check} />
          <Text
          style={{color: theme.colors.text}}
            className="text-xs font-Iregular px-2">
            Download and setup Mendeley
          </Text>
        </View>
      </View>
    </View>
  );
}

export default ScheduleCard