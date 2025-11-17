import React from "react";
import { TextInput } from "react-native";

interface TextInputContainerProps {
  placeholder: string;
  value: string;
  keyboardType?: "default" | "number-pad";
  setValue: (value: string) => void;
  editable?: boolean | undefined;
}

const TextInputContainer: React.FC<TextInputContainerProps> = ({
  placeholder,
  value,
  keyboardType = "default",
  setValue,
  editable = true,
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
    value={value}
    placeholder={placeholder}
    placeholderTextColor="#ccc"
    keyboardType={keyboardType}
    onChangeText={setValue}
    editable={editable}
  />
);

export default TextInputContainer;
