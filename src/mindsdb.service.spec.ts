import { Test, TestingModule } from "@nestjs/testing";
import { MindsdbModuleOptions } from "./interfaces/mindsdb-options.interface";
import { MINDSDB_MODULE_OPTIONS } from "./mindsdb.constants";
import { MindsdbService } from "./mindsdb.service";
import { Models } from "./models";

describe("MindsdbService", () => {
  let service: MindsdbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MindsdbService,
        {
          provide: MINDSDB_MODULE_OPTIONS,
          useValue: {
            models: Models,
            project: "local",
            // @ts-expect-error - We don't need to actually connect to a MindsDB instance
            connection: {}
          } satisfies MindsdbModuleOptions,
        }
      ],
    }).compile();

    service = module.get<MindsdbService>(MindsdbService);
    jest.spyOn(service, "Client", "get").mockImplementation(() => {
      return {
        connect: jest.fn(),
        Models: {
          getModel: jest.fn(),
          getAllModels: jest.fn(),
          trainModel: jest.fn(),
        },
        Views: {
          createView: jest.fn(),
        },
      } as any;
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
