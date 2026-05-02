import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import LocationInformation from '@/components/LocationInformation/LocationInformation';
import BuildingDescription from '@/components/BuildingDescription';
import { useAppSelector } from '@/redux/hooks';
import { myContrastColor } from '@/helper/ColorHelper';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import { Image as ExpoImage } from 'expo-image';
import useLinkCoordinateModal from '@/hooks/useLinkCoordinateModal';
import DetailsImage from '@/app/(app)/campus/details/components/DetailsImage';
import DetailsHeader from '@/app/(app)/campus/details/components/DetailsHeader';
import DetailsTabs from '@/app/(app)/campus/details/components/DetailsTabs';
import { shallowEqual } from 'react-redux';
import styles from '@/app/(app)/campus/details/styles';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle/SettingsGroupTitle';
import DebugView from '@/components/DebugView';
import { TranslationKeys } from '@/locales/keys';

export interface BuildingDetailsContentProps {
    id?: string;
}

const BuildingDetailsContent: React.FC<BuildingDetailsContentProps> = ({ id }) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const { openLinkCoordinateModal } = useLinkCoordinateModal();

    const { serverInfo, appSettings, primaryColor, selectedTheme: mode } = useAppSelector((state) => ({
        serverInfo: state.settings.serverInfo,
        appSettings: state.settings.appSettings,
        primaryColor: state.settings.primaryColor,
        selectedTheme: state.settings.selectedTheme,
    }), shallowEqual);

    const campusDetails = useAppSelector((state) => {
        if (!id) return null;
        return state.campus.campusesDict[String(id)] || null;
    }, shallowEqual);

    const { buildingsOrganizations, organisations } = useAppSelector((state) => ({
        buildingsOrganizations: state.canteenReducer.buildingsOrganizations as DatabaseTypes.BuildingsOrganizations[],
        organisations: state.canteenReducer.organisations as DatabaseTypes.Organizations[],
    }), shallowEqual);

    const organisationsDict = useMemo(
        () => organisations.reduce<Record<string, DatabaseTypes.Organizations>>(
            (acc, org) => { if (org.id) acc[org.id] = org; return acc; },
            {}
        ),
        [organisations]
    );

    const buildingOrganisations = useMemo(() => {
        if (!id) return [];
        const dict = BuildingsHelper.getBuildingIdToOrganizationsDict(buildingsOrganizations, organisationsDict);
        return dict[id] ?? [];
    }, [id, buildingsOrganizations, organisationsDict]);

    const { width: screenWidth } = useWindowDimensions();

    const projectLogo = serverInfo?.info?.project?.project_logo;
    const defaultImage = useMemo(() => getImageUrl(projectLogo), [projectLogo]);
    const [activeTab, setActiveTab] = useState<'information' | 'description'>('information');

    const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : primaryColor;
    const contrastColor = myContrastColor(campus_area_color, theme, mode === 'dark');

    const imageSource = useMemo(() => {
        if (!campusDetails) return { uri: defaultImage };
        if (campusDetails?.image_remote_url || campusDetails?.image) {
            return { uri: (campusDetails?.image_remote_url as string) || getImageUrl(String(campusDetails?.image)) };
        }
        return { uri: defaultImage };
    }, [campusDetails, defaultImage]);

    useEffect(() => {
        if (imageSource?.uri) {
            ExpoImage.prefetch?.(imageSource.uri).catch(() => {});
        }
    }, [imageSource]);

    const handleOpenNavigation = useCallback(() => {
        if (!campusDetails) return;
        const point = campusDetails.coordinates as { coordinates?: [number, number] } | undefined | null;
        const coordinates = Array.isArray(point?.coordinates) ? point?.coordinates : undefined;
        if (!coordinates || coordinates.length !== 2) {
            console.error('Invalid coordinates');
            return;
        }
        const [longitude, latitude] = coordinates;
        openLinkCoordinateModal({
            latlon: { latitude, longitude },
        });
    }, [campusDetails, openLinkCoordinateModal]);

    const renderContent = useMemo(() => {
        if (activeTab === 'information') return <LocationInformation campusDetails={campusDetails} />;
        if (activeTab === 'description') return <BuildingDescription campusDetails={campusDetails} />;
        return null;
    }, [activeTab, campusDetails]);

    const themeStyles = useMemo(
        () => ({
            backgroundColor: campus_area_color,
            borderColor: campus_area_color,
            color: contrastColor,
        }),
        [campus_area_color, contrastColor]
    );

    return (
        <ScrollView
            style={{ ...styles.container, backgroundColor: theme.screen.background }}
            contentContainerStyle={{ ...styles.contentContainer, paddingHorizontal: screenWidth > 900 ? 20 : 10 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={{ ...styles.bulidingContainer, width: screenWidth > 1000 ? '80%' : '100%', flexDirection: 'column' }}>
                <DetailsImage imageSource={imageSource} screenWidth={screenWidth} />

                <View style={{ ...styles.detailsContainer, width: '100%' }}>
                    <DetailsHeader
                        alias={campusDetails?.alias}
                        screenWidth={screenWidth}
                        theme={theme}
                        translate={translate}
                        onOpenNavigation={handleOpenNavigation}
                    />

                    <DetailsTabs
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        screenWidth={screenWidth}
                        theme={theme}
                        themeStyles={themeStyles}
                        contrastColor={contrastColor}
                        translate={translate}
                    >
                        {renderContent}
                    </DetailsTabs>
                </View>

                {buildingOrganisations.length > 0 && (
                    <View style={{ width: '100%' }}>
                        <SettingsGroupTitle>{translate(TranslationKeys.organisations)}</SettingsGroupTitle>
                        {buildingOrganisations.map((org, index) => {
                            const total = buildingOrganisations.length;
                            const groupPosition =
                                total === 1
                                    ? 'single'
                                    : index === 0
                                    ? 'top'
                                    : index === total - 1
                                    ? 'bottom'
                                    : 'middle';
                            return (
                                <SettingsList
                                    key={org.id}
                                    title={org.alias ?? org.id ?? ''}
                                    groupPosition={groupPosition}
                                    showSeparator={index < total - 1}
                                    noIconIndent
                                />
                            );
                        })}
                    </View>
                )}

                <DebugView title="Building">
                    <Text style={{ color: theme.screen.text }}>{JSON.stringify(campusDetails, null, 2)}</Text>
                </DebugView>
            </View>
        </ScrollView>
    );
};

export default BuildingDetailsContent;
