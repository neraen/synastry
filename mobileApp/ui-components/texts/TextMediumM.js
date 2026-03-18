import {Text, StyleSheet} from "react-native";
import {textSize} from "../../constants/textSize";
import {colors} from "../../constants/colors";

const TextMediumM = ({children, blue = false}) => {
    return (
        <Text style={[styles.txt, {color: blue ? colors.BLUE : colors.DARK}]}>{children}</Text>
    )
}

export default TextMediumM

const styles = StyleSheet.create({
    txt: {
        fontFamily: 'Medium',
        fontSize: textSize.M
    }
})