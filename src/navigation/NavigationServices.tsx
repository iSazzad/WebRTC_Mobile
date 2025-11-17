import {CommonActions, DrawerActions} from '@react-navigation/native';

export let _navigator: any;

function setTopLevelNavigator(navigatorRef: any) {
  _navigator = navigatorRef;
}

function navigateAndReset(name: any) {
  _navigator.dispatch(
    CommonActions.reset({
      index: 0,
      routeNames: [name],
      routes: [{name: name}],
    }),
  );
}

function navigateToNext(name: any, data: any) {
  _navigator.navigate(name, data);
}

function navigateToOpenDrawer() {
  _navigator.openDrawer();
}

function navigateToCloseDrawer() {
  _navigator.dispatch(DrawerActions.closeDrawer());
}

function navigateToToggleDrawer() {
  _navigator.dispatch(DrawerActions.toggleDrawer());
}
function navigationGoBack() {
  _navigator.goBack();
}

export default {
  setTopLevelNavigator,
  navigateAndReset,
  navigateToNext,
  navigateToOpenDrawer,
  navigateToCloseDrawer,
  navigateToToggleDrawer,
  navigationGoBack,
};
