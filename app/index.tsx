

import images from '@/constants/images';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// index.js or App.tsx (top of file)
if ((!Object.prototype as any)._toString) {
  Object.defineProperty(Object.prototype, '_toString', {
    value: Object.prototype.toString,
    writable: true,
    configurable: true,
  });
}

const index = () => {
  return (
    <SafeAreaView
      className=" bg-default-light dark:bg-default-dark min-h-screen w-full flex-1"
      style={{
        flex: 1,
      }}>
      <View
        className="my-6 w-full flex-1 items-center p-4"
        style={{
          marginTop: 24,
        }}>
        <View className="h-full w-full flex-1 items-center px-4 py-6">
          <Image source={images.FractalShard} className="mt-10 h-64 w-64" resizeMode="contain" />
          <View
            className="my-5 w-full items-center justify-center"
            style={{
              marginVertical: 20,
            }}>
            <Text className="mb-2 text-center font-ibold text-2xl text-text-primary dark:text-text-dark">
              SHARD
            </Text>
            <Text className="mb-3 text-center font-iregular text-xl text-text-primary dark:text-text-dark">
              Enhance your productivity
            </Text>
          </View>
        </View>

        <View className="absolute bottom-0 w-full pb-6">
          <Text className="mb-3 text-center font-ilight text-text-light dark:text-text-dark">
            From the creators of aTownhall
          </Text>
          <Text className="text-center font-ilight text-text-light dark:text-text-dark">
            © XaviTechSavy 2025
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default index;
