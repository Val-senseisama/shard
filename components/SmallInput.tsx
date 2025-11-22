import icons from '@/constants/icons';
import React, { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import '../global.css';

const SmallInput = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  ...props
}: {
  title: string;
  handleChangeText: (text: string) => void;
  value: string;
  otherStyles?: string;
  placeholder?: string;
}) => {
  const [showPassword, setShowPassword] = useState<Boolean>(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="font-imedium text-sm text-text-primary dark:text-text-dark">{title}</Text>
      <View
        className="flex w-full flex-row items-center border-b border-text-grey-100 dark:border-text-dark"
        style={{
          borderBottomWidth: isFocused ? 2 : 1,
          borderBottomColor: isFocused ? '#2743FD' : '#B9B9B9',
        }}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          secureTextEntry={title === 'Password' && !showPassword}
          className="flex-1 bg-background-default px-4 py-3 text-text-primary dark:bg-background-dark-paper dark:text-text-dark"
          placeholderTextColor="#666666"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            borderBottomWidth: isFocused ? 2 : 1,
            borderBottomColor: isFocused ? '#2743FD' : '#B9B9B9',
          }}
          {...props}
        />
        {title === 'Password' && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="h-3 w-3"
              resizeMode="contain"
              style={{
                height: 24,
                width: 24,
              }}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SmallInput;
