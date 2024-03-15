import { Injectable, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { IModel } from "./mindsdb.models";
import { CronJob, sendAt } from "cron";
import * as dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = "UTC";

@Injectable()
export class RetrainJobService {
  private readonly logger = new Logger(RetrainJobService.name);
  private readonly schedule = new Map<
    "monthly" | "weekly" | "daily" | "hourly",
    string
  >();
  constructor(private schedulerRegistry: SchedulerRegistry) {
    this.schedule.set("monthly", "0 4 1 * *");
    this.schedule.set("weekly", "0 4 * * 0");
    this.schedule.set("daily", "0 4 * * *");
    this.schedule.set("hourly", "0 * * * *");
  }

  public async scheduleModelUpdates(
    modelDetails: (IModel & { lastRunDate: Date })[],
    triggeredFunction: (modelName: string) => Promise<void>,
    timezone: string = DEFAULT_TIMEZONE,
    scheduleOverride?: Map<"monthly" | "weekly" | "daily" | "hourly", string>
  ) {
    this.clearRetrainJobs();
    modelDetails.forEach(async ({ name, retrainSchedule, lastRunDate }) => {
      if (!retrainSchedule) {
        return;
      }

      const schedule = scheduleOverride ?? this.schedule;
      if (
        this.shouldRunNow(
          retrainSchedule,
          schedule,
          lastRunDate,
          timezone
        )
      ) {
        try {
          this.logger.log({ message: `Retraining ${name}` });
          await triggeredFunction(name);
        } catch (error) {
          this.logger.error(error);
        }
      }
      const cronExpression = schedule.get(retrainSchedule);
      if (!cronExpression) {
        return;
      }

      this.scheduleRetrainTask(
        name,
        cronExpression,
        triggeredFunction,
        timezone
      );
    });
  }

  private clearRetrainJobs() {
    this.logger.log({ message: "Clearing retrain jobs" });
    const jobNames = Array.from(this.schedulerRegistry.getCronJobs().keys());
    jobNames.forEach((jobName) => {
      if (jobName.startsWith("retrain-")) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    });
  }

  shouldRunNow(
    scheduleType: "monthly" | "weekly" | "daily" | "hourly",
    schedule: Map<"monthly" | "weekly" | "daily" | "hourly", string>,
    lastRunTime: Date,
    timezone: string
  ): boolean {
    if (!lastRunTime) return false;

    const lastRun = dayjs(lastRunTime).tz(timezone);
    const cronExpression = schedule.get(scheduleType);

    if (!cronExpression) {
      throw new Error("Invalid schedule type");
    }

    let nextRun;
    try {
      nextRun = sendAt(cronExpression);
    } catch (e) {
      throw new Error("Invalid cron expression");
    }

    const nextRunTime = dayjs(nextRun).tz(timezone, true);
    let buffer = 1 / 3; // 20 minutes

    const adjustedDate = nextRunTime.subtract(1, scheduleType.slice(0, -2) as any);

    const bufferTime = adjustedDate.subtract(buffer, "hour");

    return !lastRun.isAfter(bufferTime);
  }

  private async scheduleRetrainTask(
    modelName: string,
    cronExpression: string,
    triggeredFunction: (modelName: string) => Promise<void>,
    timezone: string = DEFAULT_TIMEZONE
  ) {
    const job = new CronJob(
      cronExpression,
      async () => {
        await triggeredFunction(modelName);
      },
      null,
      true,
      timezone
    );
    this.schedulerRegistry.addCronJob(`retrain-${modelName}`, job);
    job.start();
    this.logger.log({
      message: `Scheduled ${modelName} for retraining, schedule: ${cronExpression}`,
    });
  }
}
