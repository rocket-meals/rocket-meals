import React from 'react';
import {useBreakPointValue} from '@/helper/device/DeviceHelper';
import DirectusImage from '@/components/project/DirectusImage';
import {AspectRatio, Rectangle} from '@/components/shapes/Rectangle';
import {Heading, Text, View} from '@/components/Themed';
import {MyButton} from '@/components/buttons/MyButton';
import {DateHelper} from '@/helper/date/DateHelper';
import {useProfileLocaleForJsDate} from '@/states/SynchedProfile';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {IconNames} from '@/constants/IconNames';
import {useNewsAreaColor} from "@/states/SynchedAppSettings";


const DirectusImageWithAspectRatio = ({aspectRatio, image_url, assetId, thumbHash, accessibilityLabel}: {aspectRatio: AspectRatio | undefined, image_url: string | undefined, assetId: string | null | undefined, thumbHash: string | undefined, accessibilityLabel: string}) => {
	return (
		<Rectangle aspectRatio={aspectRatio}>
			<DirectusImage image_url={image_url} assetId={assetId} thumbHash={thumbHash} style={{width: '100%', height: '100%'}} />
		</Rectangle>
	)
}

// Define props types
interface NewsItemProps {
    image_url: string | undefined;
    accessibilityLabel: string;
    assetId: string | null | undefined;
    url: string | undefined | null;
    thumbHash: string | undefined;
    headline: string;
    text: string | null | undefined;
    date: string | null | undefined;
}

const NewsCard: React.FC<NewsItemProps> = ({ text, url, image_url, headline, assetId, thumbHash, date }) => {
	const jsLocale = useProfileLocaleForJsDate();
	const translation_read_more = useTranslation(TranslationKeys.read_more)
	const translation_image = useTranslation(TranslationKeys.image)

	const newsAreaColor = useNewsAreaColor();

	// on small devices the image will be on top with a dynamic height
	const flexDirection = useBreakPointValue({
		sm: 'column-reverse',
		md: 'row',
		lg: 'row',
		xl: 'row'
	});

	const imageWidth = useBreakPointValue({
		sm: '100%',
		md: '40%',
		lg: '33%',
		xl: '25%'
	});

	let displayedDate = '';
	if (date) {
		displayedDate = DateHelper.formatOfferDateToReadable(new Date(date), true, false);
	}

	// left 751
	// space 111
	// right 446

	function renderDateAndHeadline() {
		// headline
		// displayedDate

		let renderedDate: any = null;
		if (displayedDate) {
			renderedDate = <Text size={'sm'}>{displayedDate}</Text>
		}

		// make a view which has the heading and the date, the date is on the right and take the required space, the heading takes the rest and wraps
		return (
			<View style={{
				width: '100%',
				flexDirection: 'row',
			}}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
					<Heading style={{ flex: 1, flexWrap: 'wrap' }}>{headline}</Heading>
					<View style={{
						paddingLeft: 10,
						flexDirection: 'column',
						justifyContent: 'flex-start',
						height: '100%',
					}}
					>
						{renderedDate}
					</View>
				</View>
			</View>
		);
	}

	function renderReadMoreButton() {
		if (url) {
			return <MyButton backgroundColor={newsAreaColor} href={url} openHrefInNewTab={true} rightIcon={IconNames.news_open_external_icon} useOnlyNecessarySpace={true} text={translation_read_more} accessibilityLabel={url} />
		} else {
			return null;
		}
	}

	return (
		<View style={{width: '100%', paddingBottom: 5}}>
			<View style={{flexDirection: flexDirection, width: '100%'}}>
				<View style={{flex: 1, padding: 10, width: '100%'

				}}
				>
					{renderDateAndHeadline()}
					<Text numberOfLines={3}>{text}</Text>
					<View style={{
						marginTop: 10,
						justifyContent: 'flex-end',
						alignItems: 'flex-end',
						flex: 1,
						flexDirection: 'row'
					}}
					>
						<View>
							{renderReadMoreButton()}
						</View>
					</View>
				</View>
				<View style={{width: imageWidth}}>
					<DirectusImageWithAspectRatio accessibilityLabel={translation_image+": "+headline} aspectRatio={2} image_url={image_url} assetId={assetId} thumbHash={thumbHash} />
				</View>
			</View>
		</View>
	);
};

export default NewsCard;
