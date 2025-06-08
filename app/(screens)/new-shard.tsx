import AddImageInput from '@/components/AddImageInput';
import DrawerNavigation from '@/components/DrawerNavigation';
import SmallInput from '@/components/SmallInput';
import images from '@/constants/images';
import Session from '@/helpers/Session';
import { AntDesign } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppStore from '~/helpers/AppStore';
// import DateTimePicker from "@react-native-community/datetimepicker";
//import DateTimePicker from '@react-native-community/datetimepicker';
const newShard = () => {
  const [formData, setFormData] = useState<Record<string, any>>({
    shardName: '',
    shardImage: '',
    shardSummary: '',
    shardStart: new Date(),
    shardEnd: new Date(),
    timeless: false,
  });

  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const colorScheme = useColorScheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) setFormData((prev) => ({ ...prev, shardStart: selectedDate }));
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) setFormData((prev) => ({ ...prev, shardEnd: selectedDate }));
  };

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AppStore.get('user');
      setUser(userData);
    };

    fetchUser();
  }, []);

  return (
    <SafeAreaView className="min-h-screen min-w-full bg-background-paper dark:bg-background-dark-default">
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />
      <View className="flex  min-w-[100vw] flex-1 pt-3  ">
        <View className="my-4 flex min-w-full flex-row items-center justify-between py-2">
          <Pressable
            onPress={() => setIsDrawerOpen(true)}
            className="self-center justify-self-start ps-5">
            <AntDesign
              name="menu-unfold"
              size={24}
              color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
              className="text-text-primary dark:text-text-dark"
            />
          </Pressable>
          <View className="absolute left-1/2 -translate-x-1/2 transform">
            <Image
              source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
              resizeMode="contain"
              className="my-2 "
            />
          </View>
        </View>
        <View className="dark:bg-background-dark-paperrounded-tl-[30px] min-w-full flex-1 flex-col items-center rounded-tr-[30px] bg-background-default px-4 py-6">
          <View className="flex-1 flex-col items-center rounded-[15px] bg-background-paper p-4 dark:bg-background-dark-default">
            <View className="flex-col items-center rounded-[8px] bg-background-default px-4 py-2 dark:bg-background-dark-paper">
              <SmallInput
                title=""
                placeholder="Shard Title"
                handleChangeText={(text: string) => {
                  setFormData((prev) => ({ ...prev, shardName: text }));
                }}
                value=""
                otherStyles="mx-3"
              />

              <AddImageInput
                onImage={(uri: string) => {
                  setFormData((prev) => ({ ...prev, image: uri }));
                }}
              />
            </View>
            <View className=" mt-4 flex-col items-center rounded-[8px] bg-background-default p-4 dark:bg-background-dark-paper">
              <View className={`space-y-2 `}>
                <Text className="my-2 text-center font-imedium text-lg text-text-primary dark:text-text-dark">
                  SHARD SUMMARY
                </Text>
                <View className="flex w-full flex-row items-center border-b border-text-grey-100 dark:border-text-dark">
                  <TextInput
                    value={formData.shardSummary}
                    onChangeText={(text: string) => {
                      setFormData((prev) => ({ ...prev, shardSummary: text }));
                    }}
                    multiline={true}
                    numberOfLines={4}
                    placeholder={'Add a summary'}
                    className="min-h-[200px] flex-1 rounded-lg bg-background-default px-4 py-3 text-text-primary dark:bg-background-dark-paper dark:text-text-dark "
                    placeholderTextColor="#666666"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                      borderWidth: isFocused ? 1 : 1,
                      borderColor: isFocused ? '#2743FD' : '#B9B9B9',
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
              </View>
            </View>

            <View className=" mt-4 min-w-full flex-col items-center rounded-[8px] bg-background-default p-4 dark:bg-background-dark-paper">
              <Text className="mt-2 text-center font-imedium text-lg text-text-primary dark:text-text-dark">
                SHARD TIMELINE
              </Text>

              <View className="flex min-w-full flex-row items-center justify-around gap-2">
                {/* Start Date Picker */}
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  className="min-w-[120px] items-center border-b border-text-grey-100 py-5">
                  <Text className="font-iregular text-sm text-text-primary dark:text-text-dark">
                    {formData.shardStart.toDateString()}
                  </Text>
                </TouchableOpacity>
                {/* {showStartPicker && (
        <DateTimePicker
          value={formData.shardStart}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleStartDateChange}
        />
      )} */}

                <Text className="font-imedium text-lg text-text-primary dark:text-text-dark">
                  To
                </Text>

                {/* End Date Picker */}
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  className="min-w-[120px] items-center border-b border-text-grey-100 py-5">
                  <Text className="font-iregular text-sm text-text-primary dark:text-text-dark">
                    {formData.shardEnd.toDateString()}
                  </Text>
                </TouchableOpacity>
                {/* {showEndPicker && (
        <DateTimePicker
          value={formData.shardEnd}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleEndDateChange}
        />
      )} */}
              </View>
              <View className="my-2 w-full flex-row items-center">
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      accepted: !prev.accepted,
                    }))
                  }
                  className="mr-2 ms-4 h-5 w-5 items-center justify-center rounded border border-text-grey-100"
                  style={{
                    backgroundColor: formData.timeless ? '#4135F3' : 'transparent',
                  }}>
                  {formData.timeless && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      timeless: !prev.timeless,
                    }))
                  }
                  className="flex-1">
                  <Text className="text-base text-text-light dark:text-text-dark">Timeless</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default newShard;
