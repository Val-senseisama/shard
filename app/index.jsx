import { View, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import images from '../constants/images'
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useThemeContext } from '../ThemeProviderContext';
const index = () => {
 useEffect(() => {
   setTimeout(() => {
    router.replace('sign-in')
   }, 3000);
 
 }, [])
 
const { theme } = useThemeContext();


  return (
    <SafeAreaView
      style={{ backgroundColor: theme.colors.primary }}
      className=" w-full h-full items-center ">
      <View className="w-full h-[85vh] flex justify-center items-center px-5">
        <Image source={images.bshard} />
        <Text
          className="text-2xl font-Ibold  text-center text-dark-default pt-10"
          style={{
            fontStyle: "italic",
            fontWeight: "800",
            color: theme.colors.text,
          }}>
          SHARD
        </Text>
        <Text
        style={{color: theme.colors.text}}
        >Enhance your productivity</Text>
      </View>

      <View className="mt-16">
        <Text style={{color:theme.colors.text}} className="text-center text-xs font-Iregular text-gray-100">
          From the creators of aTownhall
        </Text>
        <Text
        style={{color:theme.colors.text}} 
          className="text-center text-xs py-2 font-Iregular text-gray-100">
          © XaviTechSavy 2024
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default index