import { DynamicModule, Module, Scope } from "@nestjs/common";
import { MindsdbService } from "./mindsdb.service";
import { MINDSDB_MODULE_OPTIONS } from "./mindsdb.constants";
import { RetrainJobService } from "./retrain-job.service";
import { ScheduleModule } from "@nestjs/schedule";
import { MindsdbModuleOptions } from "./interfaces/mindsdb-options.interface";

@Module({})
export class MindsdbModule {
  public static forRoot(options?: MindsdbModuleOptions): DynamicModule {
    const mindsdbModuleOptions = {
      provide: MINDSDB_MODULE_OPTIONS,
      useValue: options,
    };

    const providers = [
      MindsdbService,
      RetrainJobService,
      mindsdbModuleOptions,
    ];
    return {
      global: true,
      module: MindsdbModule,
      imports: [ScheduleModule.forRoot()],
      providers,
      exports: [MindsdbService, RetrainJobService],
    };
  }
}
