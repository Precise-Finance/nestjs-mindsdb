import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateMindsdbDto } from "./dto/create-mindsdb.dto";
import { RetrainMindsDbDto } from "./dto/retrain-mindsdb.dto";
import MindsDB, { TrainingOptions } from "mindsdb-js-sdk";
import {
  BatchQueryOptions,
  QueryOptions,
} from "mindsdb-js-sdk/dist/models/queryOptions";
import { ConfigService } from "@nestjs/config";
import {
  IModel,
  getFinetuneOptions,
  getPredictOptions,
  getTrainingOptions,
} from "./mindsdb.models";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { FinetuneMindsdbDto } from "./dto/finetune-mindsdb.dto";
import { MINDSDB_MODELS } from "./mindsdb.constants";
import { Readable } from "stream";

@Injectable()
export class MindsdbService implements OnModuleInit {
  private project: string;
  private projectAsIntegrationPrefix = false;
  private readonly logger = new Logger(MindsdbService.name);
  constructor(
    private readonly configService: ConfigService,
    @Inject(MINDSDB_MODELS) private readonly models: Map<string, IModel>
  ) {
    this.project = this.configService.get<string>("NODE_ENV") ?? "local";
    this.projectAsIntegrationPrefix = this.configService.get<boolean>("MINDSDB_PROJECT_AS_INTEGRATION_PREFIX") ?? false;
  }

  async onModuleInit() {
    this.configService.get<string>("MINDSDB_API_KEY");
    try {
      await this.Client.connect({
        host: this.configService.get("MINDSDB_HOST") ?? undefined,
        user: this.configService.get("MINDSDB_USER"),
        password: this.configService.get("MINDSDB_PASSWORD"),
        managed: this.configService.get("MINDSDB_MANAGED") ?? undefined,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  public get ProjectAsIntegrationPrefix() {
    return this.projectAsIntegrationPrefix;
  }

  public set ProjectAsIntegrationPrefix(projectAsIntegrationPrefix: boolean) {
    this.projectAsIntegrationPrefix = projectAsIntegrationPrefix;
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

  public set Project(project: string) {
    this.project = project;
  }

  public get Models() {
    return this.models;
  }

  async create(createMindsdbDto: CreateMindsdbDto) {
    const model = this.models.get(createMindsdbDto.name);
    // If there is no model in the cache, you should handle that case as well
    if (!model) {
      throw new Error(
        `Model data for ${createMindsdbDto.name} is not available.`
      );
    }
    const existingModel = await this.Client.Models.getModel(
      createMindsdbDto.name,
      this.project
    );
    if (existingModel && existingModel.tag === model.tag) {
      throw new Error(`Model ${createMindsdbDto.name} already exists`);
    } else if (
      existingModel &&
      !["complete", "error"].includes(existingModel.status)
    ) {
      throw new Error(
        `Model ${createMindsdbDto.name} already exists and is still training`
      );
    } else if (existingModel && existingModel.tag !== model.tag) {
      this.logger.log(
        `Model ${createMindsdbDto.name} already exists with different tag, retraining...`
      );
      return this.retrain(createMindsdbDto.name);
    }
    if (model.view) {
      const allViews = await this.Client.Views.getAllViews(this.project);
      const viewExists = allViews.some((v) => v.name === model.view.name);
      if (!viewExists) {
        this.logger.log(`View ${model.view.name} does not exist, creating...`);
        await this.Client.Views.createView(
          model.view.name ?? model.name,
          this.project,
          model.view.select
        );
      }
    }

    this.logger.log(`Creating model ${createMindsdbDto.name}...`);

    return await this.Client.Models.trainModel(
      model.name,
      model.targetColumn,
      this.project,
      getTrainingOptions(model, this.IntegrationPrefix)
    );
  }

  async findAll() {
    return this.Client.Models.getAllModels(this.project);
  }

  async findOne(id: string, version?: number) {
    return this.Client.Models.getModel(id, this.project, version);
  }

  async predict(id: string, predictMindsdbDto: PredictMindsdbDto) {
    const modelDef = this.models.get(id);
    if (!modelDef) {
      throw new Error(`Model definition for ${id} not found`);
    }

    const model = await this.Client.Models.getModel(
      id,
      this.project,
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
        getPredictOptions(modelDef, cleanedQuery) as BatchQueryOptions
      );
    } else {
      return model.query(
        getPredictOptions(modelDef, cleanedQuery) as QueryOptions
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

    return model.adjust(
      modelDef.integration ?? this.project,
      getFinetuneOptions(modelDef, this.IntegrationPrefix, finetune)
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

  async remove(name: string) {
    return this.Client.Models.deleteModel(name, this.project);
  }

  async createMLEngine(name: string, code: Readable, requirements: Readable) {
    return this.Client.MLEngines.createMLEngine(name, code, requirements);
  }

  async updateMLEngine(name: string, code: Readable, requirements: Readable) {
    const engine = await this.Client.MLEngines.getMLEngine(name);
    if (!engine) {
      throw new Error(`MLEngine ${name} does not exist`);
    }

    return this.Client.MLEngines.updateMLEngine(name, code, requirements);
  }
}
