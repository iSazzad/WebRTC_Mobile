import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Routes } from "./Routes";
import NewUserScreen from "../screens/NewUserScreen";
import DashboardScreen from "../screens/DashboardScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function StackNavigation() {
  const stackData: any[] = [
    { name: Routes.NewUser, component: NewUserScreen, gestureEnabled: false },
    {
      name: Routes.Dashboard,
      component: DashboardScreen,
      gestureEnabled: false,
    },
  ];
  return (
    <Stack.Navigator
      initialRouteName={"NewUser"}
      screenOptions={{
        headerShown: false,
      }}
    >
      {stackData.map((item, index) => {
        return (
          <Stack.Screen
            key={index}
            name={item.name}
            component={item.component}
            options={{
              gestureEnabled: item.gestureEnabled,
            }}
          />
        );
      })}
    </Stack.Navigator>
  );
}
