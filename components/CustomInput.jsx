import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import React, { useState } from "react";
import  icons  from "../constants/icons";
import { useThemeContext } from "../ThemeProviderContext";

const CustomInput = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
 const {theme} = useThemeContext();
  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-150 font-Aregular">{title}</Text>

      <View className="border-b w-full h-12 px-4 rounded-2xl focus:border-black-100 items-center flex-row">
        <TextInput
          className="flex-1 text-black font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#B9B9B9"
          onChangeText={handleChangeText}
          textColor="white"
          color="white"
          secureTextEntry={title === "Password" && !showPassword}
          style={{ color: theme.colors.text }}
        />
        {title === "Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>)}

        { title === "Confirm Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default CustomInput;
