import {Text, StyleSheet} from "react-native";
import {textSize} from "../../constants/textSize";
import {colors} from "../../constants/colors";

const TextBoldXL = ({children, blue = false}) => {
    return (
        <Text style={[styles.txt, {color: blue ? colors.BLUE : colors.DARK}]}>{children}</Text>
    )
}

export default TextBoldXL

const styles = StyleSheet.create({
    txt: {
        fontFamily: 'SemiBold',
        fontSize: textSize.XL
    }
})