import { Test, TestingModule } from "@nestjs/testing";
import { MindsdbService } from "./mindsdb.service";
import { ConfigService } from "@nestjs/config";
import { MINDSDB_MODELS } from "./mindsdb.constants";
import { Models } from "./models";

describe("MindsdbService", () => {
  let service: MindsdbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MindsdbService, ConfigService, {
        provide: MINDSDB_MODELS,
        useValue: Models,
      }],
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
