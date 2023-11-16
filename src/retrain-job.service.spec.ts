import { Test, TestingModule } from "@nestjs/testing";
import { RetrainJobService } from "./retrain-job.service";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { CronJob, sendAt } from "cron";
import * as dayjs from "dayjs";
import * as tz from "dayjs/plugin/timezone";

dayjs.extend(tz);

describe("RetrainJobService", () => {
  let service: RetrainJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [SchedulerRegistry, RetrainJobService],
    }).setLogger(console).compile();
    

    service = module.get<RetrainJobService>(RetrainJobService);
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

  it("should handle tz", () => {
    const res = service.shouldRunNow(
      "monthly",
      new Map([["monthly", "0 4 1 * *"]]),
      dayjs().tz('America/New_York').subtract(1, 'month').toDate(),
      "America/New_York"
    );
    const res2 = service.shouldRunNow(
      "monthly",
      new Map([["monthly", "0 4 1 * *"]]),
      dayjs().tz('America/New_York').add(1, 'month').toDate(),
      "America/New_York"
    );
    expect(res).toBeTruthy();
    expect(res2).toBeFalsy();
  });
});
