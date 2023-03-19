import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
  Put,
} from '@nestjs/common';
import { MindsdbService } from './mindsdb.service';
import { CreateMindsdbDto } from './dto/create-mindsdb.dto';
import { PredictMindsdbDto } from './dto/predict-mindsdb.dto';
import { AdjustMindsdbDto } from './dto/adjust-mindsdb.dto';
import { RetrainMindsDbDto } from './dto';

// @Controller('mindsdb')
export abstract class AbstractMindsdbController {
  constructor(private readonly mindsdbService: MindsdbService) {}
  /**
   *
   *
   * @param {CreateMindsdbDto} createMindsdbDto
   * @return {*}
   * @memberof MindsdbController
   */
  @Post()
  create(@Body() createMindsdbDto: CreateMindsdbDto) {
    return this.mindsdbService.create(createMindsdbDto);
  }

  @Post(':id/predict')
  predict(
    @Param(
      'id',
      new ValidationPipe({
        transform: true,
      }),
    )
    id: string,
    @Body() predictMindsdbDto: PredictMindsdbDto,
  ) {
    return this.mindsdbService.predict(id, predictMindsdbDto);
  }

  @Get()
  findAll() {
    return this.mindsdbService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('version') version?: number) {
    return this.mindsdbService.findOne(id);
  }

  @Put(':id')
  retrain(@Param('id') id: string, @Body() retrainMindsDbDto: RetrainMindsDbDto) {
    return this.mindsdbService.retrain(id, retrainMindsDbDto);
  }

  @Patch(':id')
  adjust(
    @Param('id') id: string,
    @Body() adjustMindsdbDto: AdjustMindsdbDto,
  ) {
    return this.mindsdbService.adjust(id, adjustMindsdbDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mindsdbService.remove(id);
  }
}
