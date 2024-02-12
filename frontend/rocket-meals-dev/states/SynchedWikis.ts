import {PersistentStore} from "@/helper/syncState/PersistentStore";
import {Wikis} from "@/helper/database/databaseTypes/types";
import {useSynchedResourceRaw} from "@/states/SynchedResource";
import {useIsDemo} from "@/states/SynchedDemo";

export enum Custom_Wiki_Ids {
    about_us = "about_us",
    license = "license",
    privacy_policy = "privacy_policy",
    cookieComponentConsent = "cookieComponentConsent",
    cookieComponentAbout = "cookieComponentAbout",
    terms_of_service = "terms_of_service",
    accessibility = "accessibility",
}

/**
 * Returns a tuple containing the synchronized wikis dictionary, a function to update the dictionary, and the timestamp of the last update.
 * @returns {[(Record<string, Wikis> | undefined), ((newValue: Record<string, Wikis>, timestampe?: number) => void), (number | undefined)]} A tuple containing the synchronized wikis dictionary, a function to update the dictionary, and the timestamp of the last update.
 * @throws {Error} Throws an error if there is an issue with synchronization.
 */
export function useSynchedWikisDict(): [(Record<string, Wikis> | undefined), ((newValue: Record<string, Wikis>, timestampe?: number) => void), (number | undefined)] {
  const [resourcesOnly, setResourcesOnly, resourcesRaw, setResourcesRaw] = useSynchedResourceRaw<Wikis>(PersistentStore.wikis);
  const demo = useIsDemo()
  let lastUpdate = resourcesRaw?.lastUpdate;
  let usedResources = resourcesOnly;
  if(demo) {
    usedResources = getDemoWikis()
  }
  return [usedResources, setResourcesOnly, lastUpdate]
}

/**
 * Returns a dictionary of Wikis synchronized by custom ID.
 * 
 * @returns Record<string, Wikis> - A dictionary where the keys are custom IDs and the values are Wikis.
 * 
 * @throws {Error} - If there is an issue with synchronizing the Wikis dictionary.
 */
export function useSynchedWikisDictByCustomId(): Record<string, Wikis> {
  const [wikis, setWikis, lastUpdate] = useSynchedWikisDict();
  let dictCustomIdToWiki: Record<string, Wikis> = {}
    if(wikis) {
      let wikiKeys = Object.keys(wikis)
        for(let i = 0; i < wikiKeys.length; i++) {
            let wiki = wikis[wikiKeys[i]]
            if(wiki.custom_id !== undefined){
              dictCustomIdToWiki[wiki.custom_id] = wiki
            }
        }
    }
    return dictCustomIdToWiki;
}

/**
 * Retrieves a synchronized wiki by custom ID.
 * @param customId The custom ID of the wiki to retrieve.
 * @returns The synchronized wiki corresponding to the custom ID, or undefined if not found.
 * @throws If the custom ID is not found in the synchronized wikis dictionary.
 */
export function useSynchedWikiByCustomId(customId: string): Wikis | undefined {
    const dictCustomIdToWiki = useSynchedWikisDictByCustomId()
    return dictCustomIdToWiki[customId]
}

/**
 * Retrieves a record of demo wikis.
 * @returns {Record<string, Wikis>} A record of demo wikis.
 * @throws {Error} If there is an error retrieving the demo wikis.
 */
function getDemoWikis(): Record<string, Wikis> {

  let demoResource: Wikis = {
    children: [],
    translations: [],
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    id: 123,
    sort: undefined,
    status: "",
    user_created: undefined,
    user_updated: undefined
  }

  return {
    [demoResource.id]: demoResource
  }
}