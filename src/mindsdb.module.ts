import { DynamicModule, Module, Scope } from "@nestjs/common";
import { MindsdbService } from "./mindsdb.service";
import { IModel } from "./mindsdb.models";
import { ConfigService } from "@nestjs/config";
import { MINDSDB_MODELS } from "./mindsdb.constants";
// import { MindsdbController } from './mindsdb.controller';

@Module({})
export class MindsdbModule {
  public static forRoot(models: Map<string, IModel>): DynamicModule {
    return {
      global: true,
      module: MindsdbModule,
      providers: [ConfigService, {
        provide: MINDSDB_MODELS,
        useValue: models,
      }, MindsdbService],
      exports: [MindsdbService, MINDSDB_MODELS],
    };
  }
}
