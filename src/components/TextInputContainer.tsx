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
      backgroundColor: "#333",
      borderRadius: 8,
      marginTop: 12,
      paddingHorizontal: 16,
      color: "#FFF",
    }}
    placeholder={placeholder}
    placeholderTextColor="#AAA"
    keyboardType={keyboardType}
    onChangeText={setValue}
  />
);

export default TextInputContainer;
