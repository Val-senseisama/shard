import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
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
import CustomCheckbox from "../../components/CustomCheckBox";

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
  const [ isDatePickerVisible, setDatePickerVisibility ] = useState(false);
  const [ dateType, setDateType ] = useState(null); // "start" or "end"
  const [ startDate, setStartDate ] = useState(null);
  const [ endDate, setEndDate ] = useState(null);
  const [ timeline, setTimeline ] = useState("Timeline")
  const [ isChecked, setChecked ] = useState(false);
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
      className="my-2 mx-4 w-[90vw] min-h-[70vh] rounded-[30px] rounded-tr-[30px] flex-1 items-center">
      <Text
        style={{ color: theme.colors.text }}
        className="text-base font-Imedium text-center mt-2">
        SHARD GOALS
      </Text>
      {/* <View
        style={{ backgroundColor: theme.colors.text }}
        className="h-0.5 w-[80%] my-1"
      /> */}
      <View
        style={{ backgroundColor: theme.colors.primary }}
        className="mx-4 my-3 w-[80vw] rounded-3xl flex items-center">
        <View className="flex-row items-center w-full">
          <Text
            style={{ color: theme.colors.text }}
            className="text-lg font-Iregular ml-4">
            1.
          </Text>
          <CustomInput
            placeholder="Add a shard goal"
            otherStyles="w-[80%] mb-4"
          />
          <Image source={icons.trash} resizeMode="cover" />
        </View>

        <View
          className="flex-row items-center gap-2"
          style={{ color: theme.colors.text }}>
          {/* Start Date */}
          <TouchableOpacity onPress={() => showDatePicker("start")}>
            <TextInput
              style={{
                borderBottomWidth: 1,
                paddingVertical: 1,
                color: theme.colors.text,
              }}
              editable={false}
              placeholder="Start date"
              value={formatDate(startDate)}
              className="mx-3"
            />
          </TouchableOpacity>
          <Text
            style={{ color: theme.colors.text }}
            className="mx-3 text-sm font-Iregular text-center">
            To
          </Text>
          {/* End Date */}
          <TouchableOpacity onPress={() => showDatePicker("end")}>
            <TextInput
              style={{
                borderBottomWidth: 1,
                paddingVertical: 3,
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
        <View className="flex-row items-center justify-between py-4">
          <TouchableOpacity
            style={{ backgroundColor: theme.colors.secondary }}
            className=" flex-row content-center items-center px-2 rounded-xl max-h-[36px] w-[96px] my-3">
            <Text className="text-sm">{timeline}</Text>

            <RNPickerSelect
              style={{
                color: theme.colors.text,
                inputIOS: {
                  color: theme.colors.text,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: "gray",
                  borderRadius: 4,
                  fontSize: 14,
                  marginBottom: 16,
                  paddingRight: 30, // to ensure the text is never behind the icon
                },
                inputAndroid: {
                  color: theme.colors.text,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: "gray",
                  borderRadius: 4,
                  marginBottom: 16,
                  fontSize: 14,
                  paddingRight: 30, // to ensure the text is never behind the icon
                },
              }}
              onValueChange={(value) => setTimeline(value)}
              placeholder={{ label: "Timeline", value: null }}
              items={[
                { label: "Football", value: "football" },
                { label: "Baseball", value: "baseball" },
                { label: "Hockey", value: "hockey" },
              ]}
            />
          </TouchableOpacity>

          <View
            style={{
              color: theme.colors.text,
              backgroundColor: theme.colors.secondary,
            }}
            className=" flex-row w-[96px] rounded-2xl mx-3 max-h-[48px] items-center justify-center py-2">
            <Text className="text-sm font-Iregular mx-1">Timeless</Text>
            <CustomCheckbox value={isChecked} onValueChange={setChecked} />
          </View>
        </View>

        <View>
          <View className="flex-col items-center justify-center">
            <Text
              style={{ color: theme.colors.text }}
              className="text-base font-Imedium text-center">
              MINI GOALS
            </Text>

            {/* <View
              style={{ backgroundColor: theme.colors.text }}
              className="h-0.5 w-[50%] my-1"
            /> */}
          </View>

          <View className="flex-row items-center w-full">
            <Image source={icons.trash} resizeMode="cover" />
            <CustomInput
              placeholder="Add a mini goal"
              otherStyles="w-[80%] mb-5"
            />
          </View>
          <View
            className="flex-row items-center justify-center gap-2"
            style={{ color: theme.colors.text }}>
            {/* Start Date */}
            <TouchableOpacity onPress={() => showDatePicker("start")}>
              <TextInput
                style={{
                  borderBottomWidth: 1,
                  paddingVertical: 1,
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
                  paddingVertical: 1,
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
          <View className="flex-row items-center justify-center py-4">
            <TouchableOpacity
              style={{ backgroundColor: theme.colors.secondary }}
              className=" flex-row content-center items-center px-2 rounded-xl max-h-[36px] w-[96px] my-3">
              <Text className="text-sm">{timeline}</Text>

              <RNPickerSelect
                style={{
                  color: theme.colors.text,
                  inputIOS: {
                    color: theme.colors.text,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: "gray",
                    borderRadius: 4,
                    fontSize: 14,
                    marginBottom: 16,
                    paddingRight: 30, // to ensure the text is never behind the icon
                  },
                  inputAndroid: {
                    color: theme.colors.text,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: "gray",
                    borderRadius: 4,
                    marginBottom: 16,
                    fontSize: 14,
                    paddingRight: 30, // to ensure the text is never behind the icon
                  },
                }}
                onValueChange={(value) => setTimeline(value)}
                placeholder={{ label: "Timeline", value: null }}
                items={[
                  { label: "Football", value: "football" },
                  { label: "Baseball", value: "baseball" },
                  { label: "Hockey", value: "hockey" },
                ]}
              />
            </TouchableOpacity>

            <View
              style={{
                color: theme.colors.text,
                backgroundColor: theme.colors.secondary,
              }}
              className=" flex-row w-[96px] rounded-2xl mx-3 max-h-[48px] items-center justify-center py-2">
              <Text className="text-sm font-Iregular mx-1">Timeless</Text>
              <CustomCheckbox value={isChecked} onValueChange={setChecked} />
            </View>
          </View>
        </View>

        <View className="flex-row flex-1 items-center p-4 w-full justify-evenly">
          <CustomButton
            title="New Goal"
            textStyles="py-1 mx-0.5 pr-0.5 text-sm"
            icon={icons.add}
          />

          <CustomButton
            title="New mini Goal"
            textStyles="py-1 mx-0.5 pr-0.5 text-sm"
            icon={icons.add}
            bgColor="bg-[#C068F6]"
          />
        </View>
      </View>
    </View>
  );
}
     
   
     
     

const Step3 = () => {
   const { theme } = useThemeContext();
   return (
     <View
       style={{ backgroundColor: theme.colors.secondary }}
       className="my-6 mx-4 w-[90vw] min-h-[70vh] rounded-[30px] rounded-tr-[30px] flex-1 items-center">
       <Text
         style={{ color: theme.colors.text }}
         className="text-base font-Imedium text-center mt-4">
         ADD PARTNERS
       </Text>
       <View
         style={{ backgroundColor: theme.colors.text }}
         className="h-0.5 w-[40%] my-1"
       />
       <View
         style={{
           backgroundColor: theme.colors.primary,
           color: theme.colors.text,
         }}
         className="px-4 pb-3 my-3 flex-row items-center justify-center rounded-2xl max-h-16">
         <Image
           source={icons.search}
           className="h-[24px] w-[24px] mx-3 mt-6"
           resizeMode="cover"
         />
         <CustomInput
           placeholder="Search for other shard users"
           otherStyles="w-[65vw] mb-6"
         />
       </View>

       <View
         style={{ backgroundColor: theme.colors.primary }}
         className="mt-8 ml-4 mr-4 p-4 rounded-2xl flex flex-col justify-center items-center w-[80vw]">
         <ScrollView>
           <View className="flex-row justify-center items-center">
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
                   className="font-Iregular px-2 text-base">
                   John Doe
                 </Text>
               </View>

               <View className="flex-row items-center py-2">
                 <Image source={icons.mail} />
                 <Text
                   style={{ color: theme.colors.text, fontSize: 12 }}
                   className="font-Ilight text-gray-180 px-2">
                   johndoe@gmail.com
                 </Text>
               </View>
             </View>
           </View>
           <Text style={{ color: theme.colors.text }}>Add as?</Text>
           <View className="flex-row py-2 items-center">
             <CustomButton
               title="Collaborator"
               textStyles="py-1 pl-2 mr-3 text-sm"
               containerStyles="mx-3"
             />

             <CustomButton
               title="Accountability"
               textStyles="py-1 pl-2 mr-3 text-sm"
               bgColor="bg-[#C068F6]"
               containerStyles="mx-3"
             />
           </View>
         </ScrollView>
       </View>

       <View
         style={{ backgroundColor: theme.colors.primary }}
         className="mt-8 ml-4 mr-4 p-4 rounded-2xl  w-[80vw]">
         <View className="flex-row justify-center items-center">
           <Image
             source={images.profile}
             className="w-[70px] h-[70px]"
             resizeMode="cover"
           />
           <View className="p-4">
             <Text
               style={{
                 color: theme.colors.text,
               }}
               className="font-Iregular px-2 text-base">
               John Doe
             </Text>
             <Text
               style={{ color: theme.colors.text, fontSize: 12 }}
               className="font-Ilight text-gray-180 px-2">
               johndoe@gmail.com
             </Text>
           </View>
         </View>
       </View>

       <View
         style={{ backgroundColor: theme.colors.primary }}
         className="mt-8 ml-4 mr-4 p-4 rounded-2xl  w-[80vw]">
         <View className="flex-row justify-center items-center">
           <Image
             source={images.profile}
             className="w-[70px] h-[70px]"
             resizeMode="cover"
           />
           <View className="p-4">
             <Text
               style={{
                 color: theme.colors.text,
               }}
               className="font-Iregular px-2 text-base">
               John Doe
             </Text>
             <Text
               style={{ color: theme.colors.text, fontSize: 12 }}
               className="font-Ilight text-gray-180 px-2">
               johndoe@gmail.com
             </Text>
           </View>
         </View>
       </View>
     </View>
   );
};

const Step4 = () => {
    const { theme } = useThemeContext();
    return (
      <View
        style={{ backgroundColor: theme.colors.secondary }}
        className="my-6 mx-4 w-[90vw] min-h-[70vh] rounded-[30px] rounded-tr-[30px] flex-1 items-center">
        <Text
          style={{ color: theme.colors.text }}
          className="text-base font-Imedium text-center mt-4">
          FINAL SUMMARY
        </Text>
        <View
          style={{ backgroundColor: theme.colors.text }}
          className="h-0.5 w-[40%] my-1"
        />
        <View
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.text,
          }}
          className="px-4 pb-3 my-3 items-start py-4  w-[80vw] justify-center rounded-2xl">
          <Text className="font-Imedium text-sm">Shard Summary</Text>
          <View
            style={{ backgroundColor: theme.colors.text }}
            className="h-0.5 w-[70vw] my-1"
          />
          <Text className="text-xs font-Iregular p-3">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores
            accusamus animi exercitationem odio distinctio quisquam itaque?
            Incidunt iste distinctio sit? Corporis ipsam ipsa placeat culpa,
            nesciunt voluptatibus nemo corrupti doloremque at recusandae,
            quaerat quod cupiditate reprehenderit qui ea cumque odio, voluptate
            vero eum similique adipisci repudiandae rerum nostrum. Quaerat,
            omnis!
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.text,
          }}
          className="px-4 pb-3 my-3 items-start py-4  w-[80vw] justify-center rounded-2xl">
          <Text className="font-Imedium text-sm">Shard Goals</Text>
          <View
            style={{ backgroundColor: theme.colors.text }}
            className="h-0.5 w-[70vw] my-1"
          />
          <View className="flex-row items-center py-2">
            <Image source={icons.uncheck} resizeMode="cover" />
            <Text className="text-xs font-Iregular px-2">
              Lorem ipsum dolor sit amet consectetur adipisicing.
            </Text>
          </View>
          <View className="flex-row items-center py-2">
            <Image source={icons.uncheck} resizeMode="cover" />
            <Text className="text-xs font-Iregular px-2">
              Lorem ipsum dolor sit amet consectetur adipisicing.
            </Text>
          </View>
          <View className="flex-row items-center py-2">
            <Image source={icons.uncheck} resizeMode="cover" />
            <Text className="text-xs font-Iregular px-2">
              Lorem ipsum dolor sit amet consectetur adipisicing.
            </Text>
          </View>
          <View className="flex-row items-center py-2">
            <Image source={icons.uncheck} resizeMode="cover" />
            <Text className="text-xs font-Iregular px-2">
              Lorem ipsum dolor sit amet consectetur adipisicing.
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.text,
          }}
          className="px-4 pb-3 my-3 items-start py-4  w-[80vw] justify-center rounded-2xl">
          <Text className="font-Imedium text-sm">Shard Timeline</Text>
          <View
            style={{ backgroundColor: theme.colors.text }}
            className="h-0.5 w-[70vw] my-1"
          />
          <View className="flex-row py-2 justify-center items-center">
            <CustomButton
              title="01 Jan 2024"
              textStyles="py-1 pl-2 mr-3 text-sm"
              containerStyles="mx-3"
            />
            <Text>To</Text>
            <CustomButton
              title="02 March 2024"
              textStyles="py-1 pl-2 mr-3 text-sm"
              bgColor="bg-[#C068F6]"
              containerStyles="mx-3"
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.text,
          }}
          className="px-4 pb-3 my-3 items-start py-4  w-[80vw] justify-center rounded-2xl">
          <Text className="font-Imedium text-sm">Shard Partners</Text>
          <View
            style={{ backgroundColor: theme.colors.text }}
            className="h-0.5 w-[70vw] my-1"
          />
         <View className="py-2 flex flex-row flex-wrap items-center">
  <CustomButton
    title="Levi Idahosa"
    textStyles="py-1 pl-2 mr-3 text-sm"
    containerStyles="mx-2 my-1"
  />
  <CustomButton
    title="Odiase Solomon"
    textStyles="py-1 pl-2 mr-3 text-sm"
    bgColor="bg-[#C068F6]"
    containerStyles="mx-2 my-1"
  />
  <CustomButton
    title="Uwumwonse Godslove"
    textStyles="py-1 pl-2 mr-3 text-sm"
    containerStyles="mx-2 my-1"
  />
</View>
        </View>
      </View>
    );
};

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

  // const onSwipe = ({ nativeEvent }) => {
  //   if (nativeEvent.translationX > 0) {
  //     previousStep();
  //   } else {
  //     nextStep();
  //   }
  // };

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
          className="mx-3 mt-3"
        />
      );
    });
  };

  return (
    //
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <View style={{ backgroundColor: theme.colors.secondary, flex: 1 }}>
          <View className="flex-row w-full  items-center mt-4 p-4">
            <TouchableOpacity
              className="absolute left-4 z-10 mb-3 "
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
              <Image
                source={images.bshard}
                className="w-[36px] h-[36px] px-4"
                resizeMode="cover"
              />
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
              <PanGestureHandler
              // onGestureEvent={onSwipe}
              >
                <View className="flex-1">
                  {steps[currentStep]}
                  <View className="flex-1 flex-row items-center px-5 justify-evenly">
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        marginVertical: 10,
                      }}>
                      <CustomButton
                        title="Back"
                        textStyles="px-3 py-2 mx-3 text-sm"
                        containerStyles="mx-3"
                        handlePress={previousStep}
                      />
                      {renderIndicators()}
                    </View>
                    {currentStep !== 3 ? (
                      <CustomButton
                        title="Next"
                        textStyles="px-3 py-2 mx-3 text-sm"
                        containerStyles="mx-3"
                        handlePress={nextStep}
                      />
                    ) : (
                      <CustomButton
                        title="Create"
                        textStyles="px-4 py-2 mx-4"
                        containerStyles="mx-3"
                        handlePress={nextStep}
                      />
                    )}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;

