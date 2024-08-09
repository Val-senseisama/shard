import { View, Text, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import icons from '../../constants/icons';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from 'expo-router';
import images from '../../constants/images';
import { useThemeContext } from '../../ThemeProviderContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';


const Account = () => {
  const navigation = useNavigation();
  const { theme } = useThemeContext();

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
              source={
                theme.colors.primary !== "#fff"
                  ? icons.hamburgerDark
                  : icons.hamburger
              }
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Image
              source={
                theme.colors.primary !== "#fff"
                  ? images.smallLogoDark
                  : images.smallLogo
              }
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
            className="my-4  mx-4 min-w-[90%] h-[90%] rounded-tl-[30px] rounded-tr-[30px] flex items-center">
            <View
              style={{ backgroundColor: theme.colors.primary }}
              className="mx-4 my-4 py-2 min-w-[90%]  rounded-3xl flex items-center">
              <View className="flex-row items-center">
                <Text
                  style={{ color: theme.colors.text }}
                  className="text-2xl text-center font-Iregular">
                  John Doe
                </Text>
                <TouchableOpacity>
                  <Image
                    source={icons.edit}
                    className="w-[18px] h-[18px] mx-2"
                  />
                </TouchableOpacity>
              </View>

              <Image
                source={images.profile}
                className="w-[160px] h-[160px] px-4 my-4"
              />
              <View className="flex-row items-center">
                <Text
                  style={{ color: theme.colors.text }}
                  className="text-sm font-Iregular ml-3 my-3">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Reiciendis quam labore atque deleniti.
                </Text>
                <Image source={icons.edit} className="w-[18px] h-[18px] mr-3" />
              </View>
            </View>

            <View
              style={{ backgroundColor: theme.colors.primary , color: theme.colors.text}}
              className="mx-4 my-4 rounded-2xl px-4 py-4 max-w-[90%] flex items-center justify-between">
              <CustomInput
                title="Email Address"
                keyboardType="email-address"
                otherStyles="mt-4"
                value="CwQpP@example.com"
              />
              <CustomInput
                title="Phone Number"
                secureTextEntry={true}
                otherStyles="mt-4"
                value="09155498069"
              />
              <CustomInput
                title="Password"
                secureTextEntry={true}
                otherStyles="mt-4"
                value="password123"
              />
              <CustomInput
                title="Confirm Password"
                secureTextEntry={true}
                otherStyles="mt-4"
              />

              <CustomButton 
                title="Update Profile"
                textStyles="px-4 py-2"
                containerStyles="mt-4"
              
              />
            </View>
          </View>
          <Text
            style={{ color: theme.colors.text }}
            className="text-xs text-center">
            © XaviTechSavy 2024
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default Account
