import { IsNumber, IsOptional, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';

export class PredictMindsdbDto {
  // @IsEnum(ModelName)
  // @Expose()
  // @ApiProperty({ enum: ModelName })
  // name: ModelName;
  @Expose()
  @IsOptional()
  join?: string;
  @Expose()
  @IsOptional()
  where?: string | Array<string>;
  @Expose()
  @IsOptional()
  limit?: number;
  @Expose()
  @IsOptional()
  params?: Record<string, string | number | Date>
  @Expose()
  @IsOptional()
  @IsNumber()
  version?: number;
}
