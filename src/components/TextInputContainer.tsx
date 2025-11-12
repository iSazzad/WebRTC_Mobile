import React from "react";
import { TextInput } from "react-native";

interface TextInputContainerProps {
  placeholder: string;
  keyboardType?: "default" | "number-pad";
  setValue: (value: string) => void;
}

const TextInputContainer: React.FC<TextInputContainerProps> = ({
  placeholder,
  keyboardType = "default",
  setValue,
}) => (
  <TextInput
    style={{
      height: 50,
      backgroundColor: "#fff",
      borderRadius: 8,
      marginTop: 12,
      paddingHorizontal: 16,
      color: "#111",
    }}
    placeholder={placeholder}
    placeholderTextColor="#ccc"
    keyboardType={keyboardType}
    onChangeText={setValue}
  />
);

export default TextInputContainer;
