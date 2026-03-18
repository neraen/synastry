import {Dimensions} from "react-native";

export const ICON_SIZE = 32
export const SMALL_ICON_SIZE = 24

export const SCREEN_WIDTH = Dimensions.get('screen').width;
export const SCREEN_HEIGHT = Dimensions.get('screen').height;

export const IS_SMALL_SCREEN = SCREEN_WIDTH <= 360;
export const IS_LARGE_SCREEN = SCREEN_WIDTH <= 700;