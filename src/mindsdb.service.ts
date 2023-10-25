import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateMindsdbDto } from "./dto/create-mindsdb.dto";
import { RetrainMindsDbDto } from "./dto/retrain-mindsdb.dto";
import MindsDB from "@precise/mindsdb-js-sdk";
import {
  BatchQueryOptions,
  QueryOptions,
} from "@precise/mindsdb-js-sdk/dist/models/queryOptions";
import { ConfigService } from "@nestjs/config";
import {
  IModel,
  getFinetuneOptions,
  getPredictOptions,
} from "./mindsdb.models";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { FinetuneMindsdbDto } from "./dto/finetune-mindsdb.dto";
import { MINDSDB_MODELS } from "./mindsdb.constants";

@Injectable()
export class MindsdbService implements OnModuleInit {
  private project: string;
  private readonly logger = new Logger(MindsdbService.name);
  constructor(
    private readonly configService: ConfigService,
    @Inject(MINDSDB_MODELS) private readonly models: Map<string, IModel>
  ) {
    this.project = this.configService.get<string>("NODE_ENV") ?? "mindsdb";
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
    if (
      await this.Client.Models.getModel(createMindsdbDto.name, this.project)
    ) {
      throw new Error(`Model ${createMindsdbDto.name} already exists`);
    }
    const model = this.models.get(createMindsdbDto.name);
    if (model.view) {
      if (
        (await this.Client.Views.getAllViews(this.project)).findIndex(
          (v) => v.name === model.view.name
        ) === -1
      ) {
        await this.Client.Views.createView(
          model.view.name ?? model.name,
          this.project,
          model.view.select
        );
      }
    }
    return await this.Client.Models.trainModel(
      model.name,
      model.targetColumn,
      this.project,
      {
        integration: this.project,
        ...model.trainingOptions,
      }
    );
  }

  async findAll() {
    return await this.Client.Models.getAllModels(this.project);
  }

  findOne(id: string, version?: number) {
    return this.Client.Models.getModel(id, this.project, version);
  }

  async predict(id: string, query: PredictMindsdbDto) {
    const modelDef = this.models.get(id);
    const model = await this.Client.Models.getModel(
      id,
      this.project,
      query.version
    );
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) {
        delete query[key];
      }
    });
    if (modelDef.predictOptions.join || query.join) {
      return model.batchQuery(
        getPredictOptions(modelDef, query) as BatchQueryOptions
      );
    } else {
      return model.query(getPredictOptions(modelDef, query) as QueryOptions);
    }
  }

  async finetune(id: string, finetune?: FinetuneMindsdbDto) {
    const modelDef = this.models.get(id);
    const model = await this.Client.Models.getModel(id, this.project);
    return model.adjust(
      modelDef.integration ?? this.project,
      getFinetuneOptions(modelDef, finetune)
    );
  }

  retrain(id: string, retrain?: RetrainMindsDbDto) {
    const modelDef = this.models.get(id);
    return this.Client.Models.retrainModel(
      id,
      modelDef.targetColumn,
      this.project,
      retrain
    );
  }

  remove(name: string) {
    return this.Client.Models.deleteModel(name, this.project);
  }
}
