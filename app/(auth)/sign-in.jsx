import { View, Text, ScrollView, Image, StyleSheet } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import  images  from '../../constants/images'
import CustomInput from '../../components/CustomInput'
import icons from '../../constants/icons'
import CustomButton from '../../components/CustomButton'
import { router } from 'expo-router'

const SignIn = () => {
    
    const handleClick = () => { 
        router.push('/home');
    }


  return (
    <SafeAreaView className="w-full h-full bg-white">
      <ScrollView>
        <View className="flex-1 items-center justify-between">
          <View className="w-full h-[95vh] mt-4 flex justify-center items-center">
            <Image
              source={images.bshard}
              resizeMode="cover"
              className="max-h-48 w-24"
            />
            <Text
              className="text-2xl font-Ibold text-center text-gray-100 py-4"
              style={{ fontStyle: "italic", fontWeight: "700" }}>
              SIGN IN
            </Text>
            <View
              className="pt-2 bg-white p-6 flex items-center rounded-3xl w-[85vw]"
              style={styles.shadowBox}>
              <CustomInput
                title="Email Address"
                keyboardType="email-address"
                otherStyles="mt-4"
              />
              <CustomInput
                title="Password"
                secureTextEntry={true}
                otherStyles="mt-4"
              />
              <Text
                className="text-center py-4 text-xs font-Iregular"
                style={{ fontStyle: "italic" }}>
                Or login with
              </Text>

              <View className="flex-row w-[80%] justify-between items-center gap-3 py-2">
                <Image
                  source={icons.google}
                  className="h-8 w-8"
                  resizeMode="contain"
                />
                <Image
                  source={icons.facebook}
                  className="h-8 w-8"
                  resizeMode="contain"
                />
                <Image
                  source={icons.twitter}
                  className="h-8 w-8"
                  resizeMode="contain"
                />
              </View>

              <CustomButton
                title="Sign in"
                containerStyles="my-3 mx-auto w-full px-4 h-10"
                              textStyles="text-center"
                             handlePress={handleClick}
              />
            </View>
          </View>
          <View className="w-full items-center">
            <Text className="text-center mb-2 py-3 text-xs text-gray-100">
              © XaviTechSavy 2024{" "}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shadowBox: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 10, // for Android
  },
});

export default SignIn