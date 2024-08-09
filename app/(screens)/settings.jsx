import { View, Text, Image, Switch } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import icons from '../../constants/icons';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from 'expo-router';
import images from '../../constants/images';
import { lightTheme, darkTheme } from '../../constants/theme';
import { useThemeContext } from '../../ThemeProviderContext';


const settings = () => {
  const navigation = useNavigation();
  const { theme, setTheme } = useThemeContext();
  const [ darkmode, setDarkmode ] = useState(theme === darkTheme);
  
  const toggleSwitch = () => {
  setDarkmode((previousState) => !previousState);
  setTheme(prevTheme => prevTheme === lightTheme ? darkTheme : lightTheme);
};

  return (
    <SafeAreaView>
        <View
          style={{ backgroundColor: theme.colors.secondary }}
          className={`w-full h-full`}>
          <View className="flex-row w-full items-center p-4 mt-4">
            <TouchableOpacity
              className="absolute left-4 z-10 mb-3"
              onPress={() => navigation.openDrawer()}>
              <Image
                source={darkmode ? icons.hamburgerDark : icons.hamburger}
              />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Image
                source={darkmode ? images.smallLogoDark : images.smallLogo}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Inner whitespace */}

          <View
            style={{ backgroundColor: theme.colors.primary }}
            className="h-fullrounded-tl-[30px] rounded-tr-[30px] flex items-center">
            <View
              style={{ backgroundColor: theme.colors.secondary }}
              className="my-6  mx-4 min-w-[90%] h-[90%] rounded-tl-[30px] rounded-tr-[30px] flex items-center">
              <View
                style={{ backgroundColor: theme.colors.primary }}
                className="mx-4 my-4 py-2 min-w-[80%]  rounded-3xl flex items-center">
                <Text
                style={{ color: theme.colors.text }}
                  className="text-lg text-center font-Imedium">
                  SETTINGS
                </Text>
                <View
                  style={{ backgroundColor: theme.colors.secondary }}
                  className="mx-4 my-4 rounded-2xl px-4 py-2max-w-[90%] flex-row items-center justify-between">
                  <Text
                  style={{ color: theme.colors.text }}
                    className="text-base font-Iregular px-3">
                    Dark mode
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 16,
                    }}>
                    <Switch
                      trackColor={{ false: "#767577", true: "#80C1F9" }}
                      thumbColor={darkmode ? "#4135F3" : "#f4f3f4"}
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={toggleSwitch}
                      value={darkmode}
                    />
                  </View>
                </View>
              </View>
            </View>

            <Text
              style={{ color: theme.colors.text }}
              className="text-xs text-center pt-5">
              © XaviTechSavy 2024
            </Text>
          </View>
        </View>
    </SafeAreaView>
  );
}

export default settings