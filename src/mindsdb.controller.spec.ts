import { Test, TestingModule } from "@nestjs/testing";
import { MindsdbModuleOptions } from "./interfaces/mindsdb-options.interface";
import { MINDSDB_MODULE_OPTIONS } from "./mindsdb.constants";
import { AbstractMindsdbController } from "./mindsdb.controller";
import { MindsdbService } from "./mindsdb.service";
import { Models } from './models';

class ImplMindsdbController extends AbstractMindsdbController {
  constructor(mindsdbService: MindsdbService) {
    super(mindsdbService);
  }
}

describe("MindsdbController", () => {
  let controller: AbstractMindsdbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImplMindsdbController],
      providers: [
        MindsdbService,
        {
          provide: MINDSDB_MODULE_OPTIONS,
          useValue: {
            models: Models,
            project: "local",
            // @ts-expect-error - We are only testing the controller
            connection: {}
          } satisfies MindsdbModuleOptions,
        }
      ],
    }).compile();

    controller = module.get<AbstractMindsdbController>(ImplMindsdbController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
