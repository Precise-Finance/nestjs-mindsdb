import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateMindsdbDto } from "./dto/create-mindsdb.dto";
import { RetrainMindsDbDto } from "./dto/retrain-mindsdb.dto";
import MindsDB from "mindsdb-js-sdk";
import {
  BatchQueryOptions,
  QueryOptions,
} from "mindsdb-js-sdk/dist/models/queryOptions";
import {
  IModel,
  getFinetuneOptions,
  getPredictOptions,
  getTrainingOptions,
} from "./mindsdb.models";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { FinetuneMindsdbDto } from "./dto/finetune-mindsdb.dto";
import { MINDSDB_MODULE_OPTIONS } from "./mindsdb.constants";
import { MindsdbModuleOptions } from "./interfaces/mindsdb-options.interface";

@Injectable()
export class MindsdbService implements OnModuleInit {
  private project: string;
  private readonly models: Map<string, IModel>;
  private projectAsIntegrationPrefix: boolean;
  private readonly logger = new Logger(MindsdbService.name);
  constructor(
    @Inject(MINDSDB_MODULE_OPTIONS) private readonly options: MindsdbModuleOptions,
  ) {
    this.project = options.project;
    this.projectAsIntegrationPrefix = options.projectAsIntegrationPrefix ?? false;
    this.models = options.models;
  }

  async onModuleInit() {
    try {
      const { host, user, password, managed } = this.options.connection;
      await this.Client.connect({
        host,
        user,
        password,
        managed,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  public get ProjectAsIntegrationPrefix() {
    return this.projectAsIntegrationPrefix;
  }

  private get IntegrationPrefix() {
    return this.ProjectAsIntegrationPrefix ? `${this.project}_` : "";
  }

  public get Client() {
    return MindsDB;
  }

  public get Project() {
    return this.project;
  }

  public get Models() {
    return this.models;
  }

  async create(createMindsdbDto: CreateMindsdbDto, project: string = this.project) {
    const model = this.models.get(createMindsdbDto.name);
    // If there is no model in the cache, you should handle that case as well
    if (!model) {
      throw new Error(
        `Model data for ${createMindsdbDto.name} is not available.`
      );
    }
    const existingModel = await this.Client.Models.getModel(
      createMindsdbDto.name,
      project
    );
    if (
      existingModel &&
      existingModel.status !== "error" &&
      existingModel.tag === model.tag
    ) {
      throw new Error(`Model ${createMindsdbDto.name} already exists`);
    } else if (
      existingModel &&
      !["complete", "error"].includes(existingModel.status)
    ) {
      throw new Error(
        `Model ${createMindsdbDto.name} already exists and is still training`
      );
    } else if (
      existingModel &&
      (existingModel.tag !== model.tag || existingModel.status === "error")
    ) {
      this.logger.log(
        `Model ${createMindsdbDto.name} already exists with different tag or errored, retraining...`
      );
      return this.retrain(createMindsdbDto.name);
    }
    if (model.view) {
      const allViews = await this.Client.Views.getAllViews(project);
      const viewExists = allViews.some((v) => v.name === model.view?.name);
      if (!viewExists) {
        this.logger.log(`View ${model.view.name} does not exist, creating...`);
        await this.Client.Views.createView(
          model.view.name ?? model.name,
          project,
          model.view.select
        );
      }
    }

    this.logger.log(`Creating model ${createMindsdbDto.name}...`);

    return await this.Client.Models.trainModel(
      model.name,
      model.targetColumn,
      project,
      getTrainingOptions(model, this.IntegrationPrefix)
    );
  }

  async findAll(project: string = this.project) {
    return this.Client.Models.getAllModels(project);
  }

  async findOne(id: string, version?: number, project: string = this.project) {
    return this.Client.Models.getModel(id, project, version);
  }

  async predict(id: string, predictMindsdbDto: PredictMindsdbDto, project: string = this.project) {
    const modelDef = this.models.get(id);
    if (!modelDef) {
      throw new Error(`Model definition for ${id} not found`);
    }

    const model = await this.Client.Models.getModel(
      id,
      project,
      predictMindsdbDto.version
    );
    if (!model) {
      throw new Error(`Model ${id} does not exist`);
    }

    const cleanedQuery = Object.fromEntries(
      Object.entries(predictMindsdbDto).filter(([_, v]) => v !== undefined)
    );

    if (modelDef.predictOptions.join || cleanedQuery.join) {
      return model.batchQuery(
        getPredictOptions(
          modelDef,
          `${this.IntegrationPrefix}${modelDef.integration}`,
          cleanedQuery
        ) as BatchQueryOptions
      );
    } else {
      return model.query(
        getPredictOptions(
          modelDef,
          `${this.IntegrationPrefix}${modelDef.integration}`,
          cleanedQuery
        ) as QueryOptions
      );
    }
  }

  async finetune(id: string, finetune?: FinetuneMindsdbDto) {
    const modelDef = this.models.get(id);
    if (!modelDef) {
      throw new Error(`Model definition for ${id} not found`);
    }

    const model = await this.Client.Models.getModel(id, this.project);
    if (!model) {
      throw new Error(`Model ${id} does not exist`);
    }

    const finetuneOptions = getFinetuneOptions(
      modelDef,
      this.IntegrationPrefix,
      finetune
    );
    this.logger.log({
      message: `Finetuning model ${id} with options ${JSON.stringify(
        finetuneOptions
      )}`,
      finetuneOptions,
    });
    return model.retrain(
      finetuneOptions
    );
  }

  async retrain(id: string, retrain?: RetrainMindsDbDto) {
    const modelDef = this.models.get(id);
    if (!modelDef) {
      throw new Error(`Model definition for ${id} not found`);
    }

    return this.Client.Models.retrainModel(
      id,
      modelDef.targetColumn,
      this.project,
      getTrainingOptions(modelDef, this.IntegrationPrefix, retrain)
    );
  }

  async remove(name: string, project: string = this.project) {
    return this.Client.Models.deleteModel(name, project);
  }

  // async createMLEngine(name: string, code: Readable, requirements: Readable, type?: 'venv' | 'inhouse'
  // ) {
  //   const clientMLEngines = (this.Client as any).MLEngines as any;
  //   return clientMLEngines?.createMLEngine(name, code, requirements, type);
  // }
  //
  // async updateMLEngine(name: string, code: Readable, requirements: Readable, type?: 'venv' | 'inhouse') {
  //   const clientMLEngines = (this.Client as any).MLEngines as any;
  //   const engine = await clientMLEngines?.getMLEngine(name);
  //   if (!engine) {
  //     throw new Error(`MLEngine ${name} does not exist`);
  //   }
  //
  //   return clientMLEngines?.updateMLEngine(name, code, requirements, type);
  // }
}
