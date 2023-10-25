import {
  BatchQueryOptions,
  QueryOptions,
} from "@precise/mindsdb-js-sdk/dist/models/queryOptions";
import {
  AdjustOptions,
  TrainingOptions,
} from "@precise/mindsdb-js-sdk/dist/models/trainingOptions";
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
  finetuneOptions: AdjustOptions;
}

export function getFinetuneOptions(
  model: IModel,
  finetune?: FinetuneMindsdbDto
): AdjustOptions {
  return {
    select: finetune.params
      ? queryReplacer(
          finetune?.select ?? model.finetuneOptions.select,
          finetune.params
        ) as string
      : finetune?.select ?? model.finetuneOptions.select,
    using: finetune?.using ?? model.finetuneOptions.using,
    integration: model.integration ?? model.finetuneOptions.integration,
  };
}

export function getPredictOptions(
  model: IModel,
  query?: PredictMindsdbDto
): QueryOptions | BatchQueryOptions {
  return {
    join: query?.join ?? model.predictOptions.join,
    where: query?.params
      ? queryReplacer(query.where ?? model.predictOptions.where, query?.params)
      : query.where ?? model.predictOptions.where,
    limit: query?.limit ?? model.predictOptions.limit,
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
