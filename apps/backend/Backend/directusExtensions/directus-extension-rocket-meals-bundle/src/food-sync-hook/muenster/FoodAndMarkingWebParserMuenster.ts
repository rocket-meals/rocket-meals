import {MaxManagerConnector, MaxManagerConnectorConfig} from "../helper/maxManager/MaxManagerConnector";

const defaultMaxManagerConnectorConfig: MaxManagerConnectorConfig = {
    url: "https://sw-muenster-spl24.maxmanager.xyz",
    fetchAmountDays: 14,
};

export class FoodAndMarkingWebParserMuenster extends MaxManagerConnector {

  constructor(customMaxManagerConnectorConfig?: MaxManagerConnectorConfig) {
    super(customMaxManagerConnectorConfig ? customMaxManagerConnectorConfig : defaultMaxManagerConnectorConfig);
  }

}
