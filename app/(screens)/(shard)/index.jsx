import { View, Text, TouchableOpacity, Image, FlatList } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router';
import { useThemeContext } from '../../../ThemeProviderContext';
import ShardCard from '../../../components/ShardCard';
import icons from '../../../constants/icons';
import images from '../../../constants/images';
import { shards } from '../../../constants/dummy';
import DetailButton from '../../../components/DetailButton';

const index= () => {
  const navigation = useNavigation();
  const { theme } = useThemeContext();
  //  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView>
      <View
        style={{ backgroundColor: theme.colors.secondary }}
        className="w-full h-full flex items-center ">
        <View className="flex-row w-full items-center px-4 my-4">
          <TouchableOpacity
            className="mr-5"
            onPress={() => navigation.openDrawer()}>
            <Image
              source={
                theme.colors.primary === "#fff"
                  ? icons.hamburger
                  : icons.hamburgerDark
              }
            />
          </TouchableOpacity>
          <Image
            source={
              theme.colors.primary === "#fff"
                ? images.smallLogo
                : images.smallLogoDark
            }
            resizeMode="cover"
            className="my-3 mx-auto"
          />
        </View>

        {/* Inner whitespace */}

        <View
          style={{ backgroundColor: theme.colors.primary }}
          className="h-full w-full rounded-tl-[30px] rounded-tr-[30px]  flex items-center">
          <View
            style={{ backgroundColor: theme.colors.secondary }}
            className="mx-4 min-w-[90vw] py-4 h-[70%]  rounded-3xl flex items-center my-6 justify-center">
            <View
            className='mx-auto w-full flex flex-row items-center justify-evenly'
            >
              <DetailButton title="Overview" color={theme.colors.primary} textColor={theme.colors.text} moreStyles="px-3" shadow={true}/>

              <DetailButton title="Progress" color={theme.colors.primary} textColor={theme.colors.text} moreStyles="px-3" shadow={true}/>
              <DetailButton title="Schedule" color={theme.colors.primary} textColor={theme.colors.text} moreStyles="px-3" shadow={true}/>
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

export default index