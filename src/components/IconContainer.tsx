import { StyleSheet, TouchableOpacity } from "react-native";

// 🧱 Reusable Icon Button Component
interface IconContainerProps {
  backgroundColor?: string;
  onPress: () => void;
  Icon: React.FC;
  style?: any;
}

const IconContainer: React.FC<IconContainerProps> = ({
  backgroundColor = "transparent",
  onPress,
  Icon,
  style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.iconContainer, { backgroundColor: backgroundColor }, style]}
  >
    <Icon />
  </TouchableOpacity>
);

export default IconContainer;

// 🎨 Styles
const styles = StyleSheet.create({
  iconContainer: {
    // padding: 5,
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
