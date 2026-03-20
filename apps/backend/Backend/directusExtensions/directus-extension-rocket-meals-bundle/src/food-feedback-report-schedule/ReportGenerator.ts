import { DatabaseTypes, DateHelper } from 'repo-depkit-common';
import { ApiContext } from '../helpers/ApiContext';
import { FieldFilter, Filter } from '@directus/types/dist/filter';
import { AssetHelperDirectusBackend, AssetHelperTransformOptions } from '../helpers/AssetHelperDirectusBackend';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { DictHelper } from '../helpers/DictHelper';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { FoodRatingCalculator } from '../food-feedback-rating-calculate-hook/FoodRatingCalculator';
import { EmojiHelper } from '../helpers/EmojiHelper';

export class ReportStatusTrafficLightValues {
  static RED = EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.RED_CIRCLE);
  static YELLOW = EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.YELLOW_CIRCLE);
  static GREEN = EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.GREEN_CIRCLE);
}

type Interval = {
  start: Date;
  end: Date;
};

// NA = Not Available
const VALUE_NOT_AVAILABLE = 'N/A';

export type ReportStatusTrafficLightType = string;

export type ReportEntryStatsType = {
  amount_positive_new: number;
  amount_negative_new: number;
  amount_total_new: number;
  amount_positive: number;
  amount_negative: number;
  amount_total: number;
  status_total: ReportStatusTrafficLightType;
  status_new: ReportStatusTrafficLightType;
};

export type ReportFoodEntryLabelType = ReportEntryStatsType & {
  id: string;
  alias: string;
};

export type ReportFoodEntryType = {
  id: string;
  alias: string | null | undefined;
  image_url: string | null | undefined;
  rating_average: number;
  rating_amount: number;
  comments: string[];
  comments_new: string[];
  labels: ReportFoodEntryLabelType[];
  status_rating: ReportStatusTrafficLightType;
};

export type ReportCanteenEntryLabelsType = ReportEntryStatsType & {
  label_alias: string;
};

export type ReportCanteenEntryType = {
  id: string;
  canteen_alias: string | null | undefined;
  labels: ReportCanteenEntryLabelsType[];
};

export type ReportType = {
  canteen_alias: string;
  dateHumanReadable: string;
  show_images: boolean;
  show_food_feedback_labels_for_all_time: boolean;
  show_food_feedback_labels_for_selected_period: boolean;
  show_food_comments_for_all_time: boolean;
  show_food_comments_for_selected_period: boolean;
  show_canteen_feedbacks_for_all_time: boolean;
  show_canteen_feedbacks_for_selected_period: boolean;
  food_rating_average: number;
  food_rating_threshold_bad: number;
  food_rating_threshold_good: number;
  foods: ReportFoodEntryType[];
  canteen_feedbacks: ReportCanteenEntryType[];
  icon_thumbs_up: string;
  icon_thumbs_down: string;
  icon_comment: string;
  icon_traffic_light_red: string;
  icon_traffic_light_yellow: string;
  icon_traffic_light_green: string;
  icon_star: string;
};

export type CommonReportContext = {
  reportSchedule: DatabaseTypes.CanteenFoodFeedbackReportSchedules;
  startDate: Date
  endDate: Date;
}

type CommonReportContextWithNullDates = {
  reportSchedule: DatabaseTypes.CanteenFoodFeedbackReportSchedules;
  startDate: Date | null;
  endDate: Date | null;
}

export type ReportContext = {
  canteenEntries: Record<string, DatabaseTypes.Canteens>;
} & CommonReportContext;

export class ReportGenerator {
  private readonly myDatabaseHelper: MyDatabaseHelper;

  constructor(apiContext: ApiContext) {
    this.myDatabaseHelper = new MyDatabaseHelper(apiContext);
  }

  static getCanteenAliasList(canteenEntries: Record<string, DatabaseTypes.Canteens>) {
    let canteen_alias_list = [];
    for (let canteenKey in canteenEntries) {
      let canteen = canteenEntries[canteenKey];
      if (canteen && Boolean(canteen.alias)) {
        canteen_alias_list.push(canteen.alias);
      }
    }
    return canteen_alias_list;
  }

  async getAverageRatingForAllFoods() {
    return await this.myDatabaseHelper.getFoodsHelper().calculateAverage('rating_average');
  }

  static getFoodRatingBadAndGoodThresholds(foodAverageRating: number) {
    if (foodAverageRating == 0 || foodAverageRating == null || foodAverageRating == undefined) {
      return {
        threshold_bad: 0,
        threshold_good: 0,
      };
    }
    let threshold_bad = foodAverageRating - FoodRatingCalculator.MAX_RATING_VALUE * ReportGenerator.THRESHOLD_PERCENTAGE;
    let threshold_good = foodAverageRating + FoodRatingCalculator.MAX_RATING_VALUE * ReportGenerator.THRESHOLD_PERCENTAGE;
    return {
      threshold_bad: threshold_bad,
      threshold_good: threshold_good,
    };
  }

  /**
   *
   * @param reportSchedule
   * @param startDate
   * @param endDate
   * @param canteenEntries
   * @return {Promise<{report_feedback_period_days: *, foods: {}}>}
   */
  async generateReportJSON(reportContext: ReportContext): Promise<ReportType> {
    const { reportSchedule, startDate, endDate, canteenEntries } = reportContext;
    let dateStartHumanReadable = DateHelper.getHumanReadableDate(startDate, true);
    let dateEndHumanReadable = DateHelper.getHumanReadableDate(endDate, true);
    const dateHumanReadable = '[' + dateStartHumanReadable + ' - ' + dateEndHumanReadable + ']';
    //console.log("Generate report for date: "+dateHumanReadable);

    let canteen_alias_list = ReportGenerator.getCanteenAliasList(canteenEntries);
    const canteen_alias = canteen_alias_list.join(', ');

    let show_images = reportSchedule.show_images;
    if (show_images === null || show_images === undefined) {
      show_images = true;
    }

    let show_food_feedback_labels_for_all_time = reportSchedule.show_food_feedback_labels_for_all_time;
    if (show_food_feedback_labels_for_all_time === null || show_food_feedback_labels_for_all_time === undefined) {
      show_food_feedback_labels_for_all_time = true;
    }
    let show_food_feedback_labels_for_selected_period = reportSchedule.show_food_feedback_labels_for_selected_period;
    if (show_food_feedback_labels_for_selected_period === null || show_food_feedback_labels_for_selected_period === undefined) {
      show_food_feedback_labels_for_selected_period = true;
    }

    let show_food_comments_for_all_time = reportSchedule.show_food_comments_for_all_time;
    if (show_food_comments_for_all_time === null || show_food_comments_for_all_time === undefined) {
      show_food_comments_for_all_time = true;
    }
    let show_food_comments_for_selected_period = reportSchedule.show_food_comments_for_selected_period;
    if (show_food_comments_for_selected_period === null || show_food_comments_for_selected_period === undefined) {
      show_food_comments_for_selected_period = true;
    }

    let show_canteen_feedbacks_for_all_time = reportSchedule.show_canteen_feedbacks_for_all_time;
    if (show_canteen_feedbacks_for_all_time === null || show_canteen_feedbacks_for_all_time === undefined) {
      show_canteen_feedbacks_for_all_time = true;
    }
    let show_canteen_feedbacks_for_selected_period = reportSchedule.show_canteen_feedbacks_for_selected_period;
    if (show_canteen_feedbacks_for_selected_period === null || show_canteen_feedbacks_for_selected_period === undefined) {
      show_canteen_feedbacks_for_selected_period = true;
    }

    const food_rating_average = (await this.getAverageRatingForAllFoods()) || 0;
    const foodAverageRatingThresholds = ReportGenerator.getFoodRatingBadAndGoodThresholds(food_rating_average);

    let report: ReportType = {
      canteen_alias: canteen_alias,
      dateHumanReadable: dateHumanReadable,
      //status_explanation: "Der Status zeigt "+ReportStatusTrafficLightValues.GREEN+" (Positiv), "+ReportStatusTrafficLightValues.RED+" (Negativ) und "+ReportStatusTrafficLightValues.YELLOW+" (Neutral) an. Der Status ändert bei einer Abweichung von mehr als "+(ReportGenerator.THRESHOLD_PERCENTAGE*100)+"%. Bei den Rückmeldungen mit Labels zeigt der Status in Klammern die Änderung in diesem Zeitraum an. Bei den Bewertungen der Speisen werden diese Verglichen mit der Durchschnittlichen Bewertung von "+foodAverageRatingString+".",
      show_images: show_images,
      show_food_feedback_labels_for_all_time: show_food_feedback_labels_for_all_time,
      show_food_feedback_labels_for_selected_period: show_food_feedback_labels_for_selected_period,
      show_food_comments_for_all_time: show_food_comments_for_all_time,
      show_food_comments_for_selected_period: show_food_comments_for_selected_period,
      show_canteen_feedbacks_for_all_time: show_canteen_feedbacks_for_all_time,
      show_canteen_feedbacks_for_selected_period: show_canteen_feedbacks_for_selected_period,
      food_rating_average: food_rating_average,
      food_rating_threshold_bad: foodAverageRatingThresholds.threshold_bad,
      food_rating_threshold_good: foodAverageRatingThresholds.threshold_good,
      foods: [],
      canteen_feedbacks: [],
      icon_thumbs_up: EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.THUMBS_UP, EmojiHelper.DivTextSize.MEDIUM),
      icon_thumbs_down: EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.THUMBS_DOWN, EmojiHelper.DivTextSize.MEDIUM),
      icon_comment: EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.SPEECH_BUBBLE, EmojiHelper.DivTextSize.SMALL),
      icon_traffic_light_red: ReportStatusTrafficLightValues.RED,
      icon_traffic_light_yellow: ReportStatusTrafficLightValues.YELLOW,
      icon_traffic_light_green: ReportStatusTrafficLightValues.GREEN,
      icon_star: EmojiHelper.getEmojiDivHTML(EmojiHelper.EmojiFileNames.STAR, EmojiHelper.DivTextSize.SMALL),
    };

    report.foods = await this.getReportForFoodFeedbacks(reportContext, food_rating_average);
    report.canteen_feedbacks = await this.getReportForCanteenFeedbacks(reportContext);

    return report;
  }

  static THRESHOLD_PERCENTAGE = 0.1;

  calculateTrafficLightStatus(amount_positive: number, amount_negative: number): ReportStatusTrafficLightType {
    // if there are no feedbacks, the status is orange
    let threshold_percentage = ReportGenerator.THRESHOLD_PERCENTAGE;
    // if the amount of positive is more than 10% of the amount of negative feedbacks, the status is green
    // if the amount of negative is more than 10% of the amount of positive feedbacks, the status is red
    // otherwise, the status is yellow, as the amount of positive and negative feedbacks are almost equal
    if (amount_positive === 0 && amount_negative === 0) {
      return ReportStatusTrafficLightValues.YELLOW;
    }
    let percentage_positive = amount_positive / (amount_positive + amount_negative);
    let percentage_negative = amount_negative / (amount_positive + amount_negative);
    if (percentage_positive > threshold_percentage) {
      return ReportStatusTrafficLightValues.GREEN;
    }
    if (percentage_negative > threshold_percentage) {
      return ReportStatusTrafficLightValues.RED;
    }
    return ReportStatusTrafficLightValues.YELLOW;
  }

  async getReportForCanteenFeedbacks(reportContext: ReportContext) {
    const { reportSchedule, startDate, endDate, canteenEntries } = reportContext;
    let canteens_feedbacks: ReportCanteenEntryType[] = [];

    let canteenFeedbackLabelsWithTranslations = await this.myDatabaseHelper.getCanteenFeedbackLabelsHelper().readByQuery({
      limit: -1,
      filter: {
        _and: [
          {
            [ItemsServiceHelper.FIELD_STATUS]: {
              _eq: ItemsServiceHelper.FIELD_STATUS_PUBLISHED, // get only published feedback labels
            },
          },
        ],
      },
      fields: ['*', 'translations.*'],
    });

    const filterLikes = {
      like: {
        _eq: true,
      },
    };

    const filterDislikes = {
      like: {
        _eq: false,
      },
    };

    const filterDateUpdatedFeedbackLabelEntries: Filter[] = ReportGenerator.getFilterDateUpdatedForReportFeedbackPeriodDays(startDate, endDate);

    let canteen_feedback_all: ReportCanteenEntryType = {
      id: 'all',
      canteen_alias: 'Alle',
      labels: [],
    };

    const canteen_feedback_dict: { [key: string]: ReportCanteenEntryType } = {};

    let canteenKeys = Object.keys(canteenEntries);
    // If per-canteen feedbacks are to be shown
    if (reportSchedule.show_canteen_feedbacks_also_per_canteen) {
      for (let canteenKey of canteenKeys) {
        let canteen = canteenEntries[canteenKey];
        if (!!canteen) {
          let canteenSummary: ReportCanteenEntryType = {
            id: canteen?.id,
            canteen_alias: canteen.alias,
            labels: [],
          };
          canteen_feedback_dict[canteen.id] = canteenSummary;
        }
      }
    }

    for (let canteenFeedbackLabelsWithTranslation of canteenFeedbackLabelsWithTranslations) {
      let alias = this.getTranslationOfFeedbackLabel(canteenFeedbackLabelsWithTranslation);

      const filterLabel = {
        label: {
          _eq: canteenFeedbackLabelsWithTranslation.id,
        },
      };

      // Get the counts for all canteens
      const countsAllCanteens = await this.getCanteenFeedbackCounts(filterLabel, filterLikes, filterDislikes, filterDateUpdatedFeedbackLabelEntries, null);

      canteen_feedback_all.labels.push({
        label_alias: alias,
        amount_positive_new: countsAllCanteens.amount_positive_new,
        amount_negative_new: countsAllCanteens.amount_negative_new,
        amount_total_new: countsAllCanteens.amount_total_new,
        amount_positive: countsAllCanteens.amount_positive,
        amount_negative: countsAllCanteens.amount_negative,
        amount_total: countsAllCanteens.amount_total,
        status_total: this.calculateTrafficLightStatus(countsAllCanteens.amount_positive, countsAllCanteens.amount_negative),
        status_new: this.calculateTrafficLightStatus(countsAllCanteens.amount_positive_new, countsAllCanteens.amount_negative_new),
      });

      // If per-canteen feedbacks are to be shown
      if (reportSchedule.show_canteen_feedbacks_also_per_canteen) {
        for (let canteenKey of canteenKeys) {
          let canteen = canteenEntries[canteenKey];
          if (!!canteen) {
            const countsForCanteen = await this.getCanteenFeedbackCounts(filterLabel, filterLikes, filterDislikes, filterDateUpdatedFeedbackLabelEntries, canteen);

            canteen_feedback_dict[canteen.id]?.labels.push({
              label_alias: alias,
              amount_positive_new: countsForCanteen.amount_positive_new,
              amount_negative_new: countsForCanteen.amount_negative_new,
              amount_total_new: countsForCanteen.amount_total_new,
              amount_positive: countsForCanteen.amount_positive,
              amount_negative: countsForCanteen.amount_negative,
              amount_total: countsForCanteen.amount_total,
              status_total: this.calculateTrafficLightStatus(countsForCanteen.amount_positive, countsForCanteen.amount_negative),
              status_new: this.calculateTrafficLightStatus(countsForCanteen.amount_positive_new, countsForCanteen.amount_negative_new),
            });
          }
        }
      }
    }

    canteens_feedbacks.push(canteen_feedback_all);
    let canteenFeedbackKeys = Object.keys(canteen_feedback_dict);
    for (let canteenFeedbackKey of canteenFeedbackKeys) {
      let canteenFeedback = canteen_feedback_dict[canteenFeedbackKey];
      if (!!canteenFeedback) {
        canteens_feedbacks.push(canteenFeedback);
      }
    }

    return canteens_feedbacks;
  }

  async getCanteenFeedbackCounts(filterLabel: FieldFilter, filterLikes: FieldFilter, filterDislikes: FieldFilter, filterDateUpdatedFeedbackLabelEntries: Filter[], canteen: DatabaseTypes.Canteens | null = null) {
    const canteenFilter: FieldFilter = canteen ? { canteen: { _eq: canteen.id } } : {};

    const amount_positive_new = await this.myDatabaseHelper.getCanteenFeedbackLabelsEntriesHelper().countItems({
      filter: {
        _and: [filterLabel, filterLikes, ...filterDateUpdatedFeedbackLabelEntries, canteenFilter],
      },
    });

    const amount_negative_new = await this.myDatabaseHelper.getCanteenFeedbackLabelsEntriesHelper().countItems({
      filter: {
        _and: [filterLabel, filterDislikes, ...filterDateUpdatedFeedbackLabelEntries, canteenFilter],
      },
    });

    const amount_positive = await this.myDatabaseHelper.getCanteenFeedbackLabelsEntriesHelper().countItems({
      filter: {
        _and: [filterLabel, filterLikes, canteenFilter],
      },
    });

    const amount_negative = await this.myDatabaseHelper.getCanteenFeedbackLabelsEntriesHelper().countItems({
      filter: {
        _and: [filterLabel, filterDislikes, canteenFilter],
      },
    });

    const amount_total = amount_positive + amount_negative;
    const amount_total_new = amount_positive_new + amount_negative_new;

    return {
      amount_positive_new: amount_positive_new,
      amount_negative_new: amount_negative_new,
      amount_total_new: amount_total_new,
      amount_positive: amount_positive,
      amount_negative: amount_negative,
      amount_total: amount_total,
    };
  }

  async getReportForFoodFeedbacks(reportContext: ReportContext, foodAverageRating: number | undefined) {
    const { reportSchedule, startDate, endDate, canteenEntries } = reportContext;
    let foods: ReportFoodEntryType[] = [];

    let foodDict: { [key: string]: DatabaseTypes.Foods } = {};
    let canteenKeys = Object.keys(canteenEntries);
    for (let canteenKey of canteenKeys) {
      let canteenEntry = canteenEntries[canteenKey];
      if (!!canteenEntry) {
        let foodOffersWithFood = await this.getFoodOffersWithFoodAtDateInCanteen(startDate, endDate, canteenEntry?.id);
        for (let foodOfferWithFood of foodOffersWithFood) {
          let food = foodOfferWithFood?.food;
          if (!!food && typeof food !== 'string') {
            foodDict[food.id] = food;
          }
        }
      }
    }

    let feedbackLabelsWithTranslations = await this.myDatabaseHelper.getFoodFeedbackLabelsHelper().readByQuery({
      limit: -1,
      filter: {
        _and: [
          {
            [ItemsServiceHelper.FIELD_STATUS]: {
              _eq: ItemsServiceHelper.FIELD_STATUS_PUBLISHED, // get only published feedback labels
            },
          },
        ],
      },
      fields: ['*', 'translations.*'],
    });
    const dictFeedbackLabelsWithTranslation = DictHelper.transformListToDict(feedbackLabelsWithTranslations, item => item.id);

    for (let food of Object.values(foodDict)) {
      const food_id = food?.id;
      //console.log("Get summary for food_id: "+food?.id);
      //console.log("food")
      //console.log(food)

      let comments: string[] = [];
      let comments_new: string[] = [];

      if (reportSchedule.show_food_comments_for_selected_period) {
        comments_new = await this.getAllFoodFeedbacksWithCommentsForFood(reportContext, food_id);
      }

      if (reportSchedule.show_food_comments_for_all_time) {
        let newReportContext: CommonReportContextWithNullDates = {
          ...reportContext,
          startDate: null,
          endDate: null,
        };
        comments = await this.getAllFoodFeedbacksWithCommentsForFood(newReportContext, food_id);
      }

      let labels: ReportFoodEntryLabelType[] = [];
      labels = await this.getReportFeedbackLabelsList(reportContext, food_id, dictFeedbackLabelsWithTranslation);

      let image_url = null;
      if (food?.image) {
        let file_id = food?.image;
        let publicUrl = process.env.PUBLIC_URL;
        if (publicUrl) {
          //image_url = publicUrl+'/assets/'+file_id
          image_url = AssetHelperDirectusBackend.getAssetImageURL(file_id, AssetHelperTransformOptions.SMALL_IMAGE_TRANSFORM);
        }
      }
      if (food?.image_remote_url) {
        image_url = food?.image_remote_url;
      }

      let usedRatingAverage = 0;
      if (food?.rating_average) {
        // to fixed 2 decimal places
        usedRatingAverage = food?.rating_average;
      }

      let usedRatingAmount = 0;
      if (food?.rating_amount) {
        usedRatingAmount = food?.rating_amount;
      }

      let status_rating = ReportStatusTrafficLightValues.YELLOW;
      if (food?.rating_average != null && foodAverageRating != null) {
        const epsilon = FoodRatingCalculator.MAX_RATING_VALUE * ReportGenerator.THRESHOLD_PERCENTAGE;
        if (food.rating_average > foodAverageRating + epsilon) {
          status_rating = ReportStatusTrafficLightValues.GREEN;
        } else if (food.rating_average < foodAverageRating - epsilon) {
          status_rating = ReportStatusTrafficLightValues.RED;
        }
      }

      let foodSummary: ReportFoodEntryType = {
        id: food.id,
        alias: food.alias,
        image_url: image_url,
        rating_average: usedRatingAverage,
        rating_amount: usedRatingAmount,
        comments: comments,
        comments_new: comments_new,
        labels: labels,
        status_rating: status_rating,
      };

      foods.push(foodSummary);
    }
    return foods;
  }

  getTranslationOfFeedbackLabel(feedbackLabelWithTranslation: DatabaseTypes.FoodsFeedbacksLabels | DatabaseTypes.CanteensFeedbacksLabels): string {
    // TODO: Read FoodsFeedbacksLabelsTranslations and return the text
    // TODO: Maybe create a translation helper for the backend similar to the one in the frontend
    return feedbackLabelWithTranslation?.alias || feedbackLabelWithTranslation.id;
  }

  async getReportFeedbackLabelsList(reportContext: ReportContext, food_id: string, dictFeedbackLabelsWithTranslation: Record<string, DatabaseTypes.FoodsFeedbacksLabels>): Promise<ReportFoodEntryLabelType[]> {
    const { startDate, endDate } = reportContext;
    const foodFeedbackLabelEntriesService = this.myDatabaseHelper.getFoodFeedbackLabelEntriesHelper();

    const filterLikes = {
      like: {
        _eq: true,
      },
    };

    const filterDislikes = {
      like: {
        _eq: false,
      },
    };

    const filterFeedbackLabelEntriesFoodEquals: Filter = {
      food: {
        _eq: food_id,
      },
    };

    let filterDateUpdatedFeedbackLabelEntries: Filter[] = ReportGenerator.getFilterDateUpdatedForReportFeedbackPeriodDays(startDate, endDate);

    let labels_counted_as_list: ReportFoodEntryLabelType[] = [];

    let feedbackLabelKeys = Object.keys(dictFeedbackLabelsWithTranslation);
    for (let feedbackLabelKey of feedbackLabelKeys) {
      let feedbackLabelWithTranslation = dictFeedbackLabelsWithTranslation[feedbackLabelKey];
      if (!!feedbackLabelWithTranslation) {
        let feedbackLabelId = feedbackLabelWithTranslation?.id;

        let filterFeedbackLabelEntriesFeedbackLabelEquals: Filter = {
          label: {
            _eq: feedbackLabelId,
          },
        };

        let amount_positive_new = await foodFeedbackLabelEntriesService.countItems({
          filter: {
            _and: [filterFeedbackLabelEntriesFoodEquals, filterFeedbackLabelEntriesFeedbackLabelEquals, ...filterDateUpdatedFeedbackLabelEntries, filterLikes],
          },
        });
        let amount_negative_new = await foodFeedbackLabelEntriesService.countItems({
          filter: {
            _and: [filterFeedbackLabelEntriesFoodEquals, filterFeedbackLabelEntriesFeedbackLabelEquals, ...filterDateUpdatedFeedbackLabelEntries, filterDislikes],
          },
        });

        let amount_positive = await foodFeedbackLabelEntriesService.countItems({
          filter: {
            _and: [filterFeedbackLabelEntriesFoodEquals, filterFeedbackLabelEntriesFeedbackLabelEquals, filterLikes],
          },
        });

        let amount_negative = await foodFeedbackLabelEntriesService.countItems({
          filter: {
            _and: [filterFeedbackLabelEntriesFoodEquals, filterFeedbackLabelEntriesFeedbackLabelEquals, filterDislikes],
          },
        });

        let amount_total = amount_positive + amount_negative;
        let amount_total_new = amount_positive_new + amount_negative_new;

        let alias = this.getTranslationOfFeedbackLabel(feedbackLabelWithTranslation);

        let labelEntry: ReportFoodEntryLabelType = {
          id: feedbackLabelId,
          alias: alias,
          amount_positive_new: amount_positive_new,
          amount_negative_new: amount_negative_new,
          amount_total_new: amount_total_new,
          amount_positive: amount_positive,
          amount_negative: amount_negative,
          amount_total: amount_total,
          status_total: this.calculateTrafficLightStatus(amount_positive, amount_negative),
          status_new: this.calculateTrafficLightStatus(amount_positive_new, amount_negative_new),
        };

        labels_counted_as_list.push(labelEntry);
      }
    }

    return labels_counted_as_list;
  }

  public static getFilterDateUpdatedForReportFeedbackPeriodDays(startDate: Date, endDate: Date): Filter[] {
    let endDatePlusOneDay = new Date(endDate);
    endDatePlusOneDay.setDate(endDatePlusOneDay.getDate() + 1);

    return [
      {
        date_updated: {
          _gte: DateHelper.foodofferDateTypeToString(DateHelper.getFoodofferDateTypeFromDate(startDate)),
        },
      },
      {
        date_updated: {
          _lt: DateHelper.foodofferDateTypeToString(DateHelper.getFoodofferDateTypeFromDate(endDatePlusOneDay)),
        },
      },
    ];
  }

  async getAllFoodFeedbacksWithCommentsForFood(reportContext: CommonReportContextWithNullDates, food_id: string) {
    const { startDate, endDate } = reportContext;
    let itemService = this.myDatabaseHelper.getFoodFeedbacksHelper();

    const filter: Filter[] = [
      {
        food: {
          _eq: food_id,
        },
      },
      {
        comment: {
          _nnull: true,
        },
      },
    ];

    if (startDate != null && endDate != null) {
      let filterDateUpdated = ReportGenerator.getFilterDateUpdatedForReportFeedbackPeriodDays(startDate, endDate);
      if (filterDateUpdated) {
        filter.push(...filterDateUpdated);
      }
    }

    let feedbacksWithCommentsAndCanteenObject = await itemService.readByQuery({
      filter: {
        _and: filter,
      },
      fields: ['*', 'canteen.*'],
      limit: -1,
    });

    let comments = [];
    for (let feedback of feedbacksWithCommentsAndCanteenObject) {
      let comment = feedback?.comment;
      const canteen = feedback.canteen;
      let canteenAlias: string | null | undefined;
      if (!!canteen && typeof canteen !== 'string') {
        canteenAlias = canteen.alias;
      }

      if (comment) {
        // we should sanitize the comment here just to be sure that we don't have any html tags in the comment
        let sanitized_comment = comment.replace(/<[^>]*>?/gm, '');
        if (!!canteenAlias) {
          sanitized_comment += ' [' + canteenAlias + ']';
        }
        comments.push(sanitized_comment);
      }
    }
    return comments;
  }

  async getFoodOffersWithFoodAtDateInCanteen(startDate: Date, endDate: Date, canteen_id: string) {
    const startFoodofferDateString = DateHelper.foodofferDateTypeToString(DateHelper.getFoodofferDateTypeFromDate(startDate));
    const endFoodofferDateString = DateHelper.foodofferDateTypeToString(DateHelper.getFoodofferDateTypeFromDate(endDate));

    let itemService = this.myDatabaseHelper.getFoodoffersHelper();

    return await itemService.readByQuery({
      filter: {
        _and: [
          {
            date: {
              _between: [startFoodofferDateString, endFoodofferDateString],
            },
          },
          {
            canteen: {
              _eq: canteen_id,
            },
          },
        ],
      },
      fields: ['*', 'food.*'],
      limit: -1,
    });
  }
}
