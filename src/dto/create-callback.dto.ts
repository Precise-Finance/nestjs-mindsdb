import { Expose } from "class-transformer";

export default class CreateCallbackDto {
  @Expose()
  url: string;
  @Expose()
  options?: {
    filter: {
      model_name: string;
      project_name: string;
      new_status: string[];
    };
    attempt: {
      count: number;
      http_timeout: number;
      interval: number;
    };
  };
}
