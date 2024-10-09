import { TouchableOpacity, Text, Image } from "react-native";
import React from "react";

const CustomButton = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
  bgColor,
  icon
}) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`${bgColor ? bgColor: "bg-blue"} rounded-xl flex-row justify-center items-center ${containerStyles} ${
        isLoading ? "opacity-50" : ""
      }`}
      disabled={isLoading}>
      {icon &&
        <Image
        source={icon}
        resizeMode="contain"
        className="mx-2 w-[16px] h-[16px]"
        />}
      <Text className={`text-white font-Isemibold text-lg ${textStyles}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;
