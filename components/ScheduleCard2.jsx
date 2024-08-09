import { View, Text, Image } from "react-native";
import React from "react";
import DetailButton from "./DetailButton";
import icons from "../constants/icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeContext } from "../ThemeProviderContext";

const ScheduleCard2 = () => {
  const {theme} = useThemeContext()
  return (
    <SafeAreaView
      style={{ backgroundColor: theme.colors.secondary }}
      className="p-4  min-w-[98%] rounded-2xl border-l-[25px] border-l-[#A09AF9] my-2">
      <View>
        <Text
          style={{color: theme.colors.text}}
          className="text-base font-Iregular text-center">
          Start chapter one
        </Text>
      </View>
      <View className="flex-row items-center justify-evenly">
        <Image source={icons.clock}
        style={{tintColor: theme.colors.text}}
        />
        <DetailButton title="02:00 PM" color="#A09AF9" />
        <Text style={{color: theme.colors.text}}>To</Text>
        <DetailButton title="03:30 PM" color="#7068F6" />
      </View>

      <View>
        <View className="flex-row items-center my-2">
          <Image source={icons.uncheck} />
          <Text style={{color: theme.colors.text}} className="text-xs font-Iregular px-2">
            Start introduction and chapter 1
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ScheduleCard2;
