import React, { useState, useMemo, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, FlatList, useWindowDimensions } from "react-native";
import { useThemeContext } from "../ThemeProviderContext";

const useDateArray = (selectedDate) => {
  return useMemo(() => {
    const currentDate = new Date(selectedDate);
    const dates = [];

    // Calculate the start date (10 days before the selected date)
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - 10);

    // Generate 21 days (10 days before, current day, 10 days after)
    for (let i = 0; i < 21; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }

    return dates;
  }, [selectedDate]);
};




const DateSelector = () => {
  const {theme} = useThemeContext()
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dates = useDateArray(selectedDate);
  const { width } = useWindowDimensions();
  
const scrollViewRef = useRef(null);
  const itemWidth = width * 0.12;
  

  const handleDateChange = useCallback((date) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), date.day);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const getMonthName = useCallback((monthIndex) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return monthNames[monthIndex];
  }, []);

  const getItemLayout = useCallback((data, index) => ({
    length: width * 0.1,
    offset: (width * 0.1) * index,
    index,
  }), [width]);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      className="p-2"
      onPress={() => handleDateChange(item)}>
      <Text
        style={{color: theme.colors.text}}
        className={`font-Iregular text-xs text-grey-100 ${
          item.day === selectedDate.getDate() &&
          item.month === selectedDate.getMonth() &&
          item.year === selectedDate.getFullYear()
            ? "bg-gray-150 rounded-lg text-2xl font-Ibold p-2"
            : ""
        }`}>
        {item.day}
      </Text>
    </TouchableOpacity>
  ), [selectedDate, handleDateChange]);

  return (
    <View className="p-4">
      <Text
      style={{color: theme.colors.text}}
        className="text-lg text-center font-Isemibold">
        {getMonthName(selectedDate.getMonth())} {selectedDate.getFullYear()}
      </Text>
      <View className="flex-row justify-around mt-2 h-18 w-full">
        <FlatList
          ref={scrollViewRef}
          horizontal
          data={dates}
          keyExtractor={(item) => `${item.day}-${item.month}-${item.year}`}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={10}
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            paddingHorizontal: width / 2 - itemWidth / 2,
          }}
          onLayout={() => {
            scrollViewRef.current?.scrollToIndex({
              index: 10,
              animated: false,
            });
          }}
        />
      </View>
    </View>
  );
};

export default DateSelector;