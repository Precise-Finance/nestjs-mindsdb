import { IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { JsonValue } from 'mindsdb-js-sdk/dist/util/json';

export class FinetuneMindsdbDto {
  /** SELECT SQL statement to use for selecting data. */
  @Expose()
  @IsOptional()
  select?: string;
  /** Model and training parameters to set during adjustment. */
  @Expose()
  @IsOptional()
  using?: Record<string, JsonValue>;
  @Expose()
  @IsOptional()
  params?: Record<string, string | number | Date>;
}
