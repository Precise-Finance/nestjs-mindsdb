import {
  BatchQueryOptions,
  QueryOptions,
} from "@precise/mindsdb-js-sdk/dist/models/queryOptions";
import {
  AdjustOptions,
  TrainingOptions,
} from "@precise/mindsdb-js-sdk/dist/models/trainingOptions";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { AdjustMindsdbDto } from "./dto/adjust-mindsdb.dto";
import * as mysql from 'mysql';


export enum Granularity {
  day = "day",
  month = "month",
  week = "week",
  quarter = "quarter",
  year = "year",
}

export class IModel {
  granularity?: Granularity;
  name: string;
  targetColumn: string;
  integration?: string;
  view?: {
    select: string;
    name?: string;
  };
  trainingOptions: TrainingOptions;
  predictOptions: {
    where: string | Array<string>;
    join: string;
    limit?: number;
  };
  adjustOptions: AdjustOptions;
}

export function getAdjustOptions(model: IModel, adjust: AdjustMindsdbDto) {
  return {
    select: adjust.select ?? model.adjustOptions.select,
    using: adjust.using ?? model.adjustOptions.using,
  };
}

export function getPredictOptions(
  model: IModel,
  query: PredictMindsdbDto
): QueryOptions | BatchQueryOptions {
  return {
    join: query.join ?? model.predictOptions.join,
    where:
      query.where ?? query.params
        ? queryReplacer(model.predictOptions.where, query.params)
        : model.predictOptions.where,
    limit: query.limit ?? model.predictOptions.limit,
  };
}

const queryReplacer = (
  query: string | Array<string>,
  queryParams: Record<string, string | number | Date>
) => {
  const r = (query: string) =>
    Object.keys(queryParams).reduce(
      (acc, key) =>
        acc.replace(
          key,
          mysql.escape(
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
