import { DynamicModule, Module, Provider, Scope } from "@nestjs/common";
import { MindsdbService } from "./mindsdb.service";
import { MINDSDB_MODULE_OPTIONS } from "./mindsdb.constants";
import { RetrainJobService } from "./retrain-job.service";
import { ScheduleModule } from "@nestjs/schedule";
import { MindsdbModuleAsyncOptions, MindsdbModuleOptions } from "./interfaces/mindsdb-options.interface";

@Module({})
export class MindsdbModule {
  public static forRoot(options?: MindsdbModuleOptions): DynamicModule {
    const mindsdbModuleOptions = {
      provide: MINDSDB_MODULE_OPTIONS,
      useValue: options,
    };

    const providers = [
      ...this.getBaseProviders(),
      mindsdbModuleOptions,
    ];
    return {
      global: true,
      module: MindsdbModule,
      // @ts-expect-error - Nestjs does not allow for readonly arrays, but that is a bug in their types
      imports: this.getBaseImports(),
      providers,
      // @ts-expect-error - Nestjs does not allow for readonly arrays, but that is a bug in their types
      exports: this.getBaseExports(),
    };
  }

  private static getBaseImports() {
    return [
      ScheduleModule.forRoot(),
    ] as const;
  }

  private static getBaseProviders() {
    return [
      MindsdbService,
      RetrainJobService,
    ] as const;
  }

  private static getBaseExports() {
    return [
      MindsdbService,
      RetrainJobService,
    ] as const;
  }

  public static forRootAsync(options: MindsdbModuleAsyncOptions): DynamicModule {
    const providers = [
      {
        provide: MINDSDB_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      ...this.getBaseProviders(),
      ...(options.extraProviders || []),
    ];

    return {
      module: MindsdbModule,
      imports: [
        ...(options.imports || []),
        ...this.getBaseImports(),
      ],
      providers,
      // @ts-expect-error - Nestjs does not allow for readonly arrays, but that is a bug in their types
      exports: this.getBaseExports(),
    };
  }
}
