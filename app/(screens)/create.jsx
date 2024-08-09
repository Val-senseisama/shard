import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "../../constants/icons";
import images from "../../constants/images";
import { useThemeContext } from "../../ThemeProviderContext";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { useNavigation } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import RNPickerSelect from "react-native-picker-select";

const indicatorIcons = {
  default: icons.pellet, // Path to your icon image
};

const Step1 = () => {
  const { theme } = useThemeContext();
  return (
    <View
      style={{ backgroundColor: theme.colors.secondary }}
      className="my-4 mx-4 w-[90vw] min-h-[70vh] rounded-[30px] rounded-tr-[30px] flex-1 items-center">
      <View
        style={{ backgroundColor: theme.colors.primary }}
        className="mx-4 my-4 w-[80vw] rounded-3xl flex items-center">
          <CustomInput placeholder="Shard title" otherStyles="w-[75vw] text-base" />

        <Image
          source={images.addCircle}
          className="w-[100px] h-[100px] px-4 my-3"
          resizeMode="contain"
        />

        <Text
          style={{ color: theme.colors.text }}
          className="text-sm font-Iregular pb-3">
          Accepted formats are png and jpg
        </Text>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.text,
        }}
        className="mx-4 my-4 rounded-2xl px-4 py-4 w-[80vw] min-h-[35vh] max-h-[48vh] flex-1  items-center">
        <TextInput
          multiline={true}
          numberOfLines={18}
          style={{
            color: theme.colors.text,
            backgroundColor: theme.colors.primary,
          }}
          className="text-base font-Iregular w-full p-3 rounded-2xl h-full"
          placeholder="Add a shard summary"
          textAlignVertical="top"
        />
      </View>
    </View>
  );
};

const Step2 = () => {
   const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
   const [dateType, setDateType] = useState(null); // "start" or "end"
   const [startDate, setStartDate] = useState(null);
   const [endDate, setEndDate] = useState(null);

   const showDatePicker = (type) => {
     setDateType(type);
     setDatePickerVisibility(true);
   };

   const hideDatePicker = () => {
     setDatePickerVisibility(false);
   };

   const handleConfirm = (selectedDate) => {
     if (dateType === "start") {
       setStartDate(selectedDate);
     } else {
       setEndDate(selectedDate);
     }
     hideDatePicker();
   };

   const formatDate = (date) => {
     if (!date) return "";
     const day = date.getDate().toString().padStart(2, "0");
     const month = (date.getMonth() + 1).toString().padStart(2, "0");
     const year = date.getFullYear();
     return `${day}/${month}/${year}`;
   };

  const { theme } = useThemeContext();
 return (
<View
  style={{ backgroundColor: theme.colors.secondary }}
  className="my-4 px-4 w-screen min-h-screen max-h-[75vh] rounded-[30px] rounded-tr-[30px] flex-1 justify-center">
     <Text
       style={{ color: theme.colors.text }}
       className="text-base font-Imedium text-center mt-2">
       SHARD GOALS
     </Text>
     <View
       style={{ backgroundColor: theme.colors.text }}
       className="h-0.5 w-[80%] my-1"
     />
     <View
       style={{ backgroundColor: theme.colors.primary }}
       className="mx-4 my-4 w-[80vw] rounded-3xl flex items-center">
       <View className="flex-row items-center w-full">
         <Text
           style={{ color: theme.colors.text }}
           className="text-lg font-Iregular">
           1.
         </Text>
         <CustomInput
           placeholder="Add a shard goal"
           otherStyles="w-[80%] mb-5"
         />
         <Image
           source={images.unfilledShard}
           className="w-[24px] h-[30px] px-4"
           resizeMode="contain"
         />
       </View>

       <View
         className="flex-row items-center gap-2"
         style={{ color: theme.colors.text }}>
         {/* Start Date */}
         <TouchableOpacity onPress={() => showDatePicker("start")}>
           <TextInput
             style={{
               borderBottomWidth: 1,
               paddingVertical: 10,
               color: theme.colors.text,
             }}
             editable={false}
             placeholder="Start date"
             value={formatDate(startDate)}
             className="mx-4"
           />
         </TouchableOpacity>
         <Text
           style={{ color: theme.colors.text }}
           className="mx-4 text-sm font-Iregular text-center">
           To
         </Text>
         {/* End Date */}
         <TouchableOpacity onPress={() => showDatePicker("end")}>
           <TextInput
             style={{
               borderBottomWidth: 1,
               paddingVertical: 10,
               color: theme.colors.text,
             }}
             editable={false}
             placeholder="End date"
             value={formatDate(endDate)}
           />
         </TouchableOpacity>
       </View>
       <DateTimePickerModal
         isVisible={isDatePickerVisible}
         mode="date"
         onConfirm={handleConfirm}
         onCancel={hideDatePicker}
       />
       <View>
         <RNPickerSelect
           onValueChange={(value) => console.log(value)}
           items={[
             { label: "Football", value: "football" },
             { label: "Baseball", value: "baseball" },
             { label: "Hockey", value: "hockey" },
           ]}
         />
       </View>
       <Text
         style={{ color: theme.colors.text }}
         className="text-sm font-Iregular my-3">
         Accepted formats are png and jpg
       </Text>
     </View>

     <View
       style={{
         backgroundColor: theme.colors.primary,
         color: theme.colors.text,
       }}
       className="mx-4 my-4 rounded-2xl px-4 py-4 max-w-[90%] min-h-[45%] flex items-center justify-between">
       <TextInput
         multiline={true}
         numberOfLines={18}
         style={{
           color: theme.colors.text,
           backgroundColor: theme.colors.secondary,
         }}
         className="text-base font-Iregular min-w-[100%] p-3 rounded-2xl min-h-fit"
         placeholder="Add a shard summary"
         textAlignVertical="top"
       />
     </View>
   </View>
 );};

const Step3 = () => (
  <View>
    <Text>Step 3</Text>
  </View>
);

const Step4 = () => (
  <View>
    <Text>Step 4</Text>
  </View>
);

const Create = () => {
  const { theme } = useThemeContext();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [<Step1 />, <Step2 />, <Step3 />, <Step4 />];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };


  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSwipe = ({ nativeEvent }) => {
    if (nativeEvent.translationX > 0) {
      previousStep();
    } else {
      nextStep();
    }
  };

  const renderIndicators = () => {
    return steps.map((step, index) => {
      let tintColor;
      if (index === currentStep) {
        tintColor = "#4135F3"; // Bright purple
      } else if (index === currentStep + 1) {
        tintColor = "#A09AF9"; // Duller purple
      } else {
        tintColor = "#C9CDD2"; // Dull grey
      }
      return (
        <Image
          key={index}
          source={indicatorIcons.default}
          style={{ tintColor }}
          className="mx-3"
        />
      );
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ backgroundColor: theme.colors.secondary, flex: 1}}>
        <View className="flex-row w-full  items-center p-4 mt-4">
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
        {currentStep !== 0 && (
          <View className="flex-row w-full justify-center items-center p-4 header">
            <Image source={images.bshard} className="w-[48px] h-[48px] px-4" />
            <Text
              style={{ color: theme.colors.text }}
              className="text-2xl font-Iregular text-center underline">
              Finish the Shard Project
            </Text>
          </View>
        )}

        <View
          style={{ backgroundColor: theme.colors.primary, flex: 1 }}
          className="rounded-tl-[30px] rounded-tr-[30px] items-center">
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PanGestureHandler onGestureEvent={onSwipe}>
              <View className="flex-1">
                {steps[currentStep]}
                <View className="flex-1 flex-row items-center px-5 justify-between">
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      marginVertical: 10,
                    }}>
                    {renderIndicators()}
                  </View>
                  <CustomButton
                    title="Next"
                    textStyles="px-4 py-2 mx-4"
                    containerStyles=" w-[140px] mx-3"
                    handlePress={nextStep}
                  />
                </View>
              </View>
            </PanGestureHandler>
          </GestureHandlerRootView>
          <Text
            style={{ color: theme.colors.text }}
            className="text-xs text-center">
            © XaviTechSavy 2024
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Create;
