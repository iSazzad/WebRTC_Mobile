import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import * as React from "react";
import { Color } from "../utils/colors";
import StackNavigation from "./StackNavigation";
import navigationServices from "./NavigationServices";

export default function Navigation() {
  const NewDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Color.ThemeMain,
    },
  };

  return (
    <NavigationContainer
      ref={(navigatorRef: any) => {
        navigationServices.setTopLevelNavigator(navigatorRef);
      }}
      theme={NewDefaultTheme}
    >
      <StackNavigation />
    </NavigationContainer>
  );
}
