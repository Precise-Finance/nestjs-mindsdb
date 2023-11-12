import {
  BatchQueryOptions,
  QueryOptions,
} from "mindsdb-js-sdk/dist/models/queryOptions";
import {
  AdjustOptions,
  TrainingOptions,
} from "mindsdb-js-sdk/dist/models/trainingOptions";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { FinetuneMindsdbDto } from "./dto/finetune-mindsdb.dto";
import * as mysql from "mysql";

export enum Granularity {
  day = "day",
  month = "month",
  week = "week",
  quarter = "quarter",
  year = "year",
}

/**
 * Interface for a MindsDB model
 */
export class IModel {
  /**
   * The granularity of the model
   */
  granularity?: Granularity;
  /**
   * The name of the model
   */
  name: string;
  /**
   * The target column of the model
   */
  targetColumn: string;
  /**
   * The integration used by the model
   */
  integration?: string;
  /**
   * The view used by the model
   */
  view?: {
    /**
     * The select statement of the view
     */
    select: string;
    /**
     * The name of the view
     */
    name?: string;
  };
  /**
   * The training options of the model
   */
  trainingOptions: TrainingOptions;

  /**
   * The version of the model
   */
  tag: string;
  /**
   * The prediction options of the model
   */
  predictOptions: {
    /**
     * The where clause of the prediction
     */
    where: string | Array<string>;
    /**
     * The join statement of the prediction
     */
    join: string;
    /**
     * The limit of the prediction
     */
    limit?: number;
  };
  /**
   * The fine-tuning options of the model
   */
  finetuneOptions: AdjustOptions;
}

/**
 * Returns the options for training a MindsDB model.
 * @param model - The MindsDB model to finetune.
 * @param options - The training options to use.
 * @returns The options for training the MindsDB model.
 */
export function getTrainingOptions(
  model: IModel,
  integrationPrefix?: string,
  options?: TrainingOptions
): AdjustOptions {
  
  const using = {
    ...(model.trainingOptions.using || {}),
    tag: model.tag,
  };
  const to = {
    ...model.trainingOptions,
    ...(options || {}),
  }
  return {
    ...to,
    select: options?.select ?? model.trainingOptions.select,
    using: options?.using ? { ...options, tag: model.tag } : using,
    integration: `${integrationPrefix ?? ""}${
      model.trainingOptions.integration ?? model.integration
    }`,
  };
}

/**
 * Returns the options for finetuning a MindsDB model.
 * @param model - The MindsDB model to finetune.
 * @param finetune - The finetune options to use.
 * @returns The options for finetuning the MindsDB model.
 */
export function getFinetuneOptions(
  model: IModel,
  integrationPrefix?: string,
  finetune?: FinetuneMindsdbDto
): AdjustOptions {
  return {
    select: finetune.params
      ? (queryReplacer(
          finetune?.select ?? model.finetuneOptions.select,
          finetune?.params
        ) as string)
      : finetune?.select ?? model.finetuneOptions.select,
    using: finetune?.using ?? model.finetuneOptions.using,
    integration: `${integrationPrefix ?? ""}${
      model.finetuneOptions.integration ?? model.integration
    }`,
  };
}

/**
 * Returns the query options for a MindsDB prediction request.
 * @param model - The MindsDB model to use for the prediction.
 * @param query - The query parameters for the prediction request.
 * @returns The query options for the prediction request.
 */
export function getPredictOptions(
  model: IModel,
  integration: string,
  query?: PredictMindsdbDto
): QueryOptions | BatchQueryOptions {
  return {
    join:
      query?.join?.replace("$INTEGRATION$", integration) ??
      model.predictOptions.join.replace("$INTEGRATION$", integration),
    where: query?.params
      ? queryReplacer(query.where ?? model.predictOptions.where, query?.params)
      : query.where ?? model.predictOptions.where,
    limit: query?.limit ?? model.predictOptions.limit,
  };
}

/**
 * Replaces placeholders in a SQL query string with corresponding values from an object of query parameters.
 * @param query - The SQL query string or an array of SQL query strings to replace placeholders in.
 * @param queryParams - An object containing key-value pairs of query parameter names and their corresponding values.
 * @returns The SQL query string with placeholders replaced by their corresponding values.
 */
const queryReplacer = (
  query: string | Array<string>,
  queryParams: Record<string, string | number | Date>
) => {
  const r = (query: string) =>
    Object.keys(queryParams).reduce(
      (acc, key) =>
        acc.replace(
          key,
          queryParams[key] === "LATEST" // LATEST is a special value in MindsDB
            ? queryParams[key] as string
            : mysql.escape(
                queryParams[key] instanceof Date
                  ? (queryParams[key] as Date).toISOString()
                  : queryParams[key]
              )
        ),
      query
    );

  if (Array.isArray(query)) {
    return query.map((q) => r(q));
  }
  return r(query);
};
