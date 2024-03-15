import { IModel, getFinetuneOptions, getPredictOptions } from "./mindsdb.models";
import { Models } from "./models";

describe("MindsdbModels", () => {
  beforeEach(async () => {
    // const module: TestingModule = await Test.createTestingModule({
    //   providers: [MindsdbService, ConfigService, {
    //     provide: MINDSDB_MODELS,
    //     useValue: Models,
    //   }],
    // }).compile();
    // service = module.get<MindsdbService>(MindsdbService);
    // jest.spyOn(service, "Client", "get").mockImplementation(() => {
    //   return {
    //     connect: jest.fn(),
    //     Models: {
    //       getModel: jest.fn(),
    //       getAllModels: jest.fn(),
    //       trainModel: jest.fn(),
    //     },
    //     Views: {
    //       createView: jest.fn(),
    //     },
    //   } as any;
    // });
  });

  it("should be defined", () => {
    const result = getPredictOptions(Models.get("balance_auto") as IModel, 'ss', {
      params: {
        $CUSTOMER_ID$: 1123213,
        $DATE$: new Date('2022-01-01'),
      },
    });
    expect(result.where).toEqual(["t.customerId = 1123213", "t.date > '2022-01-01T00:00:00.000Z'"]);
  });

  it("finetune params", () => {
    const result = getFinetuneOptions(Models.get("balance_auto") as IModel, 'asdsa', {
      params: {
        $CUSTOMER_ID$: 1123213,
        $DATE$: new Date('2022-01-01'),
      },
    });
    // expect(result).toEqual("select * from enriched_balance where customerId = 1123213 and date > '2022-01-01T00:00:00.000Z'");
    expect(result.select).toEqual("select * from enriched_balance where customerId = 1123213 and date > '2022-01-01T00:00:00.000Z'");
  });
});
