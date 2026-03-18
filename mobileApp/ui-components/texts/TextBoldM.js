import {Text, StyleSheet} from "react-native";
import {textSize} from "../../constants/textSize";
import {colors} from "../../constants/colors";

const TextBoldM = ({children, blue = false, style}) => {
    return (
        <Text style={[styles.txt, {color: blue ? colors.BLUE : colors.DARK}, style]}>{children}</Text>
    )
}

export default TextBoldM

const styles = StyleSheet.create({
    txt: {
        fontFamily: 'SemiBold',
        fontSize: textSize.M
    }
})