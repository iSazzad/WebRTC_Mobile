import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Color } from "../../utils/colors";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {segments.map((item, index) => {
        const isActive = selectedIndex === index;

        return (
          <TouchableOpacity
            key={`${item}-${index}`}
            style={[styles.button, isActive && styles.activeButton]}
            onPress={() => onChange(index)}
            activeOpacity={0.8}
          >
            <Text style={[styles.text, isActive && styles.activeText]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default SegmentedControl;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Color.TitleGrey,
    borderRadius: 10,
    padding: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: Color.ThemeMain,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    color: Color.TextBlack,
  },
  activeText: {
    color: Color.White,
    fontWeight: "600",
  },
});
