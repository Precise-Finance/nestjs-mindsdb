import { IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateMindsdbDto {
  @Expose()
  name: string;


}
