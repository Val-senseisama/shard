import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import icons from '../../constants/icons';
import images from '../../constants/images';
import { useNavigation } from "@react-navigation/native";
import ShardCard from '../../components/ShardCard';
import { shards } from '../../constants/dummy';
import DateSelector from '../../components/DateSelector';
import ScheduleCard from '../../components/ScheduleCard';
import ScheduleCard2 from '../../components/ScheduleCard2';
import { useThemeContext } from '../../ThemeProviderContext';

const Schedule = () => {
  const { theme } = useThemeContext();
  const navigation = useNavigation();
    return (
      <SafeAreaView>
        <View
          style={{ backgroundColor: theme.colors.secondary }}
          className="w-full h-full bg-secondary ">
          <View className="flex-row w-full items-center p-4 mt-4">
            <TouchableOpacity
              className="absolute left-4 z-10"
              onPress={() => navigation.openDrawer()}>
              <Image source={theme.colors.primary === "#fff" ?  icons.hamburger: icons.hamburgerDark} />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Image source={theme.colors.primary === "#fff" ? images.smallLogo: images.smallLogoDark} resizeMode="cover" />
            </View>
          </View>

          {/* Inner whitespace */}

          <View
          style={{ backgroundColor: theme.colors.primary }}
            className="h-full  rounded-tl-[30px] rounded-tr-[30px] flex items-center">
            <View
            style={{ backgroundColor: theme.colors.secondary }}
              className="mt-6 mx-4 rounded-tl-[30px] rounded-tr-[30px] flex items-center">
              <View
                style={{ backgroundColor: theme.colors.primary }}
                className="mx-4 my-4 py-2 rounded-3xl flex items-center">
                <DateSelector />
              </View>
              <Text style={{ color: theme.colors.text }} className="text-lg my-4 font-Imedium">TODAY'S GOALS</Text>
              <View style={{ backgroundColor: theme.colors.primary }} className="mx-4 h-[70%] w-full rounded-3xl p-4">
                <ScheduleCard />
                <ScheduleCard2 />
              </View>
            </View>

            <Text style={{ color: theme.colors.text }} className="text-xs text-center pt-5">
              © XaviTechSavy 2024
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
}

export default Schedule