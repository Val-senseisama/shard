import { View, Text, TouchableOpacity, Image, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import icons from '../../constants/icons'
import { useNavigation } from "@react-navigation/native";
import images from '../../constants/images';
import { StatusBar } from 'expo-status-bar';
import ShardCard from '../../components/ShardCard';
import { shards } from '../../constants/dummy';
import { useThemeContext } from '../../ThemeProviderContext';
import { useMemo } from 'react';
import { router } from 'expo-router';



const Home = () => {
  const navigation = useNavigation();
   const { theme } = useThemeContext();
  //  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView>
      <View
        style={{ backgroundColor: theme.colors.secondary }}
        className="w-full h-full flex items-center ">
        <View className="flex-row w-full items-center justify-evenly p-4 my-4">
          <TouchableOpacity
            className="mr-2"
            onPress={() => navigation.openDrawer()}>
            <Image source={theme.colors.primary === "#fff" ? icons.hamburger : icons.hamburgerDark} />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Image source={images.profile} className="w-[56px] h-[56px] px-4" />
            <Text
              style={{ color: theme.colors.text }}
              className="text-2xl font-Imedium mx-4">Welcome John</Text>
          </View>
        </View>

        {/* Inner whitespace */}

        <View
          style={{ backgroundColor: theme.colors.primary }}
          className="h-full w-full rounded-tl-[30px] rounded-tr-[30px]  flex items-center">
          <Image
            source={theme.colors.primary === "#fff" ? images.smallLogo : images.smallLogoDark}
            resizeMode="cover"
            className="my-4"
          />
          <View
            style={{ backgroundColor: theme.colors.secondary }}
            className="mx-4 min-w-[90vw] py-4 h-[70%]  rounded-3xl flex items-center justify-center">
             <FlatList
                data={shards}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={() =>
                <ShardCard
                  shard={
                     {image:icons.addSquare,
                  title:"Create a new shard",
                      description: "Enhance your productivity",
                      handlePress: () => router.push("/create")
                    }
                 }
              />}
              renderItem={({ item }) => (
                 
                  <ShardCard
                    shard={item}
                  />
                )}
           />
          </View>
          <Text style={{ color: theme.colors.text }} className="text-xs text-center pt-5">© XaviTechSavy 2024</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default Home