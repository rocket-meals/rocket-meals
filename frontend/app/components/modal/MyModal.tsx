import React from 'react';
import {Modal} from 'react-native';
import {Heading, View} from '@/components/Themed';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {MyTouchableOpacity} from "@/components/buttons/MyTouchableOpacity";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {useProjectColor} from "@/states/ProjectInfo";
import {DrawerConfigPosition, useDrawerPosition} from "@/states/DrawerSyncConfig";
import {MyButton} from "@/components/buttons/MyButton";
import {IconNames} from "@/constants/IconNames";


export const MyModalHeader = ({
		primaryContent, title, secondaryContent}: {
		primaryContent: React.ReactNode,
		title: string,
		secondaryContent: React.ReactNode
	}) => {
	const [drawerPosition, setDrawerPosition] = useDrawerPosition(); // Gets and sets the current drawer position (left/right).

	let leftContent = primaryContent;
	let rightContent = secondaryContent;
	if(drawerPosition === DrawerConfigPosition.Right){
		leftContent = secondaryContent;
		rightContent = primaryContent;
	}

	return (

		<View style={{
			width: "100%",
			paddingLeft: 20,
			paddingRight: 20,
			marginBottom: 20,
			flexDirection: "row",
		}}>
			<View style={{
				flex: 1,
				alignItems: "flex-start",
			}}>
				<View>
					{leftContent}
				</View>
			</View>
			<View style={{
				flex: 5,
				alignItems: "center",
			}}>
				<Heading>{title}</Heading>
			</View>
			<View style={{
				flex: 1,
				alignItems: "flex-end",
			}}>
				<View>
					{rightContent}
				</View>
			</View>

		</View>
	)
}

export const MyModalContent = ({children}: {children: React.ReactNode}) => {
	return (
		<View style={{
			width: "100%",
			height: "950%",
			backgroundColor: "blue",
		}}>
			{children}
		</View>
	)

}

export type setVisibleType = (visible: boolean) => void

export type MyModalProps = {
	visible: boolean,
	setVisible: React.Dispatch<React.SetStateAction<boolean>> | setVisibleType,
	backgroundColor: string | undefined | null,
	title?: string,
	onCancel?: () => Promise<void> | void,
	children?: React.ReactNode | React.ReactNode[]
	renderContent?: (hide: () => void) => React.ReactNode | React.ReactNode[]
}
export const MyModal = (props: MyModalProps) => {
	const onCancel = async () => {
		if(props.onCancel){
			await props.onCancel();
		}
		props.setVisible(false);
	}
	const visible = props.visible;
	const viewBackgroundColor = props.backgroundColor;
	const projectColor = useProjectColor();
	const borderColor = projectColor
	const translation_cancel = useTranslation(TranslationKeys.cancel);
	const translation_attention = useTranslation(TranslationKeys.attention);
	const title = props.title || translation_attention

	/**
	 * supportedOrientations?:
	 *     | Array<
	 *         | 'portrait'
	 *         | 'portrait-upside-down'
	 *         | 'landscape'
	 *         | 'landscape-left'
	 *         | 'landscape-right'
	 *       >
	 *     | undefined;
	 */
	const supportedOrientations: Array<'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'> = ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']

	const MODAL_HEIGHT_PERCENT = 80;

	return(
		<Modal animationType={"none"} onRequestClose={onCancel} supportedOrientations={supportedOrientations} presentationStyle={"overFullScreen"} visible={visible} style={{
			zIndex: 1000,
		}} transparent={true}>
			<View style={{
				width: "100%",
				height: "100%",
				backgroundColor: "rgba(0,0,0,0.7)",	// background should dim the background
			}} onLayout={() => {
				console.log("MyModal: Layout MODAL")
				console.log(props.renderContent)
			}}>

				<MyTouchableOpacity accessibilityLabel={translation_cancel} onPress={onCancel} style={{
					height: (100-MODAL_HEIGHT_PERCENT)+"%",
					width: "100%",
				}} />
				<View style={{
					width: "100%",
					height: MODAL_HEIGHT_PERCENT+"%",
					backgroundColor: viewBackgroundColor,
					borderColor: borderColor,
					borderTopWidth: 1,
					//borderLeftWidth: 1,
					//borderRightWidth: 1,
					borderTopLeftRadius: 20,
					borderTopRightRadius: 20,
					paddingTop: 20,
				}}>
					<MySafeAreaView>
						<View style={{
							flexDirection: "column",
							height: "100%",
						}}>
							<MyModalHeader primaryContent={null} title={title} secondaryContent={
								<MyButton useOnlyNecessarySpace={true} icon={IconNames.cancel_icon} accessibilityLabel={translation_cancel}
										  //tooltip={translation_cancel} // TODO: The tooltip is shown behind the modal and is darkened... need some kind of z-index fix
										  onPress={onCancel} />
							} />
							<View style={{
								width: "100%",
								flexDirection: "column",
								flex: 1, // necessary to make the content scrollable
							}}>
								<View style={{
									height: "100%", // This will be 50% of the red View's height, which now takes up all remaining space
									width: "100%",
									flexDirection: "column",
								}}>
									{props.children}
									{props.renderContent ? props.renderContent(onCancel) : null}
								</View>
							</View>
						</View>

					</MySafeAreaView>
				</View>
			</View>
		</Modal>
	)
}
