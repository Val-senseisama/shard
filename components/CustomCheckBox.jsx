import { Text, TouchableOpacity, View } from "react-native";
import { useThemeContext } from "../ThemeProviderContext";

const CustomCheckbox = ({ value, onValueChange, label }) => {
    const {theme} =  useThemeContext()
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: "#1E1E1E",
          backgroundColor: value ? "#6200ee" : "transparent",
                  marginRight: 10,
          borderRadius: 6,
        }}
      />
      <Text style={{ color: theme.colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
};

export default CustomCheckbox;