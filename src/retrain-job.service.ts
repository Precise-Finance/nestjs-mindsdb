import { Injectable, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { IModel } from "./mindsdb.models";
import { CronJob, sendAt } from "cron";
import * as dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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
    timezone?: string,
    scheduleOverride?: Map<"monthly" | "weekly" | "daily" | "hourly", string>
  ) {
    this.clearRetrainJobs();
    modelDetails.forEach(async ({ name, retrainSchedule, lastRunDate }) => {
      if (retrainSchedule) {
        const schedule = scheduleOverride ?? this.schedule;
        if (
          this.shouldRunNow(
            retrainSchedule,
            schedule,
            lastRunDate,
            timezone ?? "UTC"
          )
        ) {
          try {
            this.logger.log({ message: `Retraining ${name}` });
            await triggeredFunction(name);
          } catch (error) {
            this.logger.error(error);
          }
        }
        this.scheduleRetrainTask(
          name,
          schedule.get(retrainSchedule),
          triggeredFunction,
          timezone
        );
      }
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
    this.logger.log({
      message: `Original Date: ${lastRunTime}, daysjs: ${lastRun}`,
    });
    const cronExpression = schedule.get(scheduleType);

    let nextRun;
    try {
      nextRun = sendAt(cronExpression);
    } catch (e) {
      throw new Error("Invalid cron expression");
    }

    const nextRunTime = dayjs(nextRun).tz(timezone, true);
    this.logger.log({
      message: `Next Run: ${nextRun}, daysjs: ${nextRunTime}`,
    });
    let adjustedDate;
    let buffer = 1 / 3; // 20 minutes

    adjustedDate = nextRunTime.subtract(1, scheduleType.slice(0, -2) as any);

    const bufferTime = adjustedDate.subtract(buffer, "hour");
    this.logger.log({
      message: `Adjusted Date: ${adjustedDate}, Buffer Time: ${bufferTime}`,
    });
    return !lastRun.isAfter(bufferTime);
  }

  private async scheduleRetrainTask(
    modelName: string,
    cronExpression: string,
    triggeredFunction: (modelName: string) => Promise<void>,
    timezone?: string
  ) {
    const job = new CronJob(
      cronExpression,
      async () => {
        await triggeredFunction(modelName);
      },
      null,
      true,
      timezone ?? "UTC"
    );
    this.schedulerRegistry.addCronJob(`retrain-${modelName}`, job);
    job.start();
    this.logger.log({
      message: `Scheduled ${modelName} for retraining, schedule: ${cronExpression}`,
    });
  }
}
