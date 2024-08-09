import React, { useMemo } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import images from "../constants/images"; 
import icons from "../constants/icons";
import {router, usePathname} from 'expo-router'
import {
  ThemeProvider,
  DarkTheme,
  LightTheme,
  useTheme,
} from "@react-navigation/native";
import { lightTheme, darkTheme } from "../constants/theme";
import { useThemeContext } from "../ThemeProviderContext";


const CustomDrawerContent = (props) => {
  const { navigation } = props;
  const currentRoute = usePathname()
  const isRouteActive = (routeName) => currentRoute === routeName;
  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);



  return (
    <DrawerContentScrollView {...props} style={{
      backgroundColor: theme.colors.secondary,
      flex: 1
    }}>
      <View
      style={{backgroundColor: theme.colors.primary}}
        className="mt-12 ml-4 mr-4 p-4rounded-2xl flex-row items-center">
        <Image
          source={images.profile}
          className="w-[80px] h-[80px]"
          resizeMode="cover"
        />
        <View className="p-4">
          <View className="flex-row items-center py-2">
            <Image source={icons.profile} />
            <Text
              style={{
                color: theme.colors.text,
            }}
              className="font-Iregular px-2 text-base">John Doe</Text>
          </View>

          <View className="flex-row items-center py-2">
            <Image source={icons.mail} />
            <Text
              style={{ color: theme.colors.text, fontSize:8 }}
              className="font-Ilight text-gray-180 px-2"
            >
              johndoe@gmail.com
            </Text>
          </View>
        </View>
      </View>

      <View className="flex items-center justify-center w-full pt-4">
        <Image source={theme.colors.primary === "#fff" ? images.sbh : images.sbhDark} />
      </View>

      <DrawerItem
        label="Home"
        icon={() => (
          <Image
            source={icons.home}
            style={[
              styles.icon,
              { tintColor: isRouteActive("/home") ? theme.colors.activeIcon : theme.colors.icon },
            ]}
          />
        )}
        onPress={() => router.push("home")}
        style={[
          styles.drawerItem,
          isRouteActive("/home") && styles.activeDrawerItem,
        ]}
        labelStyle={styles.drawerLabel}
      />

      <DrawerItem
        label="Schedule"
        icon={() => (
          <Image
            source={icons.schedule}
            style={[
              styles.icon,
              { tintColor: isRouteActive("/schedule")  ? theme.colors.activeIcon : theme.colors.icon },
            ]}
          />
        )}
        onPress={() => router.push("schedule")}
        style={[
          styles.drawerItem,
          isRouteActive("/schedule") && styles.activeDrawerItem,
        ]}
        labelStyle={styles.drawerLabel}
      />

      <DrawerItem
        label="Settings"
        icon={() => (
          <Image
            source={icons.settings}
            style={[
              styles.icon,
              { tintColor: isRouteActive("/settings")  ? theme.colors.activeIcon : theme.colors.icon },
            ]}
          />
        )}
        onPress={() => router.push("settings")}
        style={[
          styles.drawerItem,
          isRouteActive("/settings") && styles.activeDrawerItem,
        ]}
        labelStyle={styles.drawerLabel}
      />

      <DrawerItem
        label="Account"
        icon={() => (
          <Image
            source={icons.account}
            style={[
              styles.icon,
              { tintColor: isRouteActive("/account")  ? theme.colors.activeIcon : theme.colors.icon },
            ]}
          />
        )}
        onPress={() => router.push("account")}
        style={[
          styles.drawerItem,
          isRouteActive("/account") && styles.activeDrawerItem,
        ]}
        labelStyle={styles.drawerLabel}
      />

      <DrawerItem
        label="Logout"
        icon={() => (
          <Image
            source={icons.logout}
            style={[
              styles.icon,
              { tintColor: isRouteActive("/logout")  ? theme.colors.activeIcon : theme.colors.icon },
            ]}
          />
        )}
        onPress={() => router.push("logout")}
        style={[
          styles.drawerItem,
          isRouteActive("/logout") && styles.activeDrawerItem,
        ]}
        labelStyle={styles.drawerLabel}
      />

      <View className="flex-1 mt-24 justify-center items-center px-4">
        <Image source={theme.colors.primary === "#fff" ? images.smallLogo : images.smallLogoDark} resizeMode="cover" className="mt-8" />
        <Text
        style={{ color: theme.colors.text }}
          className="text-xs text-center pt-8">© XaviTechSavy 2024</Text>
      </View>
    </DrawerContentScrollView>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f0e9e9",
    },

    drawerItem: {
      backgroundColor: theme.colors.primary,
      marginTop: 16,
      paddingTop: 8,
      paddingRight: 16,
      paddingBottom: 8,
      paddingLeft: 16,
      borderRadius: 15,
    },

    activeDrawerItem: {
      borderLeftWidth: 20,
      borderLeftColor: "#7168f6",
      backgroundColor: theme.colors.primary,
    },

    icon: {},

    drawerLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
    },
  });

export default CustomDrawerContent;
