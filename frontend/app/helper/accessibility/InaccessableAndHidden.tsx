import {View} from "@/components/Themed";
import React from "react";

export type InaccessibleAndHiddenProps = {
  children: React.ReactNode | React.ReactNode[];
  inaccessible: boolean;
  style?: any;
}


export default function InaccessibleAndHidden(props: InaccessibleAndHiddenProps) {
  return(
      <View style={props.style} accessible={!props.inaccessible} accessibilityElementsHidden={props.inaccessible}>
        {props.children}
      </View>
  )
}