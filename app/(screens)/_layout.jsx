import { StatusBar } from "expo-status-bar";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "../../components/CustomDrawerContent"; // Adjust the path as needed

const ScreenLayout = () => {
  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />}>
          <Drawer.Screen
            name="home"
            options={{
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="schedule"
            options={{
              headerShown: false,
            }}
          />
          <Drawer.Screen
            name="settings"
            options={{
              headerShown: false,
            }}
          />

          <Drawer.Screen
            name="create"
            options={{ headerShown: false }}
          />

          <Drawer.Screen
            name="account"
            options={{
              headerShown: false,
            }}
          />
        </Drawer>
      </GestureHandlerRootView>

      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default ScreenLayout;
