import { Test, TestingModule } from "@nestjs/testing";
import { AbstractMindsdbController } from "./mindsdb.controller";
import { MindsdbService } from "./mindsdb.service";
import { ConfigService } from "@nestjs/config";
import { MINDSDB_MODELS } from "./mindsdb.constants";
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
      providers: [MindsdbService, ConfigService, {
        provide: MINDSDB_MODELS,
        useValue: Models,
      }],
    }).compile();

    controller = module.get<AbstractMindsdbController>(ImplMindsdbController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
