import React from "react";
import { View, Text, Image, StyleSheet, ViewStyle } from "react-native";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number; // avatar width & height
  style?: ViewStyle; // extra styles based on placement
}

const COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#009688",
  "#4caf50",
  "#ff9800",
  "#795548",
];

const getColorFromName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

export default function Avatar({
  name,
  imageUrl,
  size = 40,
  style,
}: AvatarProps) {
  const firstChar = name?.charAt(0).toUpperCase();
  const backgroundColor = getColorFromName(name);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.45 }]}>{firstChar}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});
