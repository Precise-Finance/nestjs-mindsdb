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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Logger,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";

import { MindsdbService } from "./mindsdb.service";
import { CreateMindsdbDto } from "./dto/create-mindsdb.dto";
import { PredictMindsdbDto } from "./dto/predict-mindsdb.dto";
import { FinetuneMindsdbDto } from "./dto/finetune-mindsdb.dto";
import { RetrainMindsDbDto } from "./dto";
import { ApiConsumes, ApiBody, ApiTags } from "@nestjs/swagger";
import { Express } from "express";
import { Readable } from "stream";

@ApiTags("mindsdb")
export abstract class AbstractMindsdbController {
  private readonly logger = new Logger(AbstractMindsdbController.name);
  constructor(protected readonly mindsdbService: MindsdbService) {}
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

  @Post(":id/predict")
  predict(
    @Param(
      "id",
      new ValidationPipe({
        transform: true,
      })
    )
    id: string,
    @Body() predictMindsdbDto: PredictMindsdbDto
  ) {
    return this.mindsdbService.predict(id, predictMindsdbDto);
  }

  @Get()
  findAll() {
    return this.mindsdbService.findAll();
  }

  @Get('callbacks')
  async getCallbacks() {
    const result = await this.mindsdbService.Client.Callbacks.getCallbacks();
    this.logger.log({ message: `getCallbacks returned with ${result?.length}`, result });
    return result;
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Query("version") version?: number) {
    return this.mindsdbService.findOne(id);
  }

  @Put(":id")
  retrain(
    @Param("id") id: string,
    @Body() retrainMindsDbDto: RetrainMindsDbDto
  ) {
    return this.mindsdbService.retrain(id, retrainMindsDbDto);
  }

  @Patch(":id")
  adjust(@Param("id") id: string, @Body() finetuneDto: FinetuneMindsdbDto) {
    return this.mindsdbService.finetune(id, finetuneDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.mindsdbService.remove(id);
  }

  @Post('callbacks')
  @ApiBody({
    description: 'Object containing the URL to create a new callback',
    required: true,
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'http://example.com/callback',
        },
      },
    },
  })
  
  async createCallback(@Body('url') url: string) {
    return this.mindsdbService.Client.Callbacks.createCallback(url);
  }

  @Delete('callbacks/:id')
  async deleteCallback(@Param('id') id: number) {
    return this.mindsdbService.Client.Callbacks.deleteCallback(+id);
  }

  @Post("ml_engine")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "code", maxCount: 1 },
      { name: "requirements", maxCount: 1 },
    ])
  )
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: {
          type: 'string',
        },
        code: {
          type: "string",
          format: "binary",
        },
        requirements: {
          type: "string",
          format: "binary",
        },
      },
      required: ['name', 'code', 'requirements'], // This makes all fields required
    },
  })
  createMLEngine(
    @Body('name') name: string,
    @UploadedFiles()
    files: {
      code?: Express.Multer.File[];
      requirements?: Express.Multer.File[];
    }
  ) {
    if (!files.code || !files.requirements) {
      throw new Error("Missing code or requirements file");
    }
    const codeStream = Readable.from(files.code[0].buffer);
    const requirementsStream = Readable.from(files.requirements[0].buffer);

    return this.mindsdbService.createMLEngine(
      name,
      codeStream,
      requirementsStream
    );
  }

  @Put("ml_engine/:id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "code", maxCount: 1 },
      { name: "requirements", maxCount: 1 },
    ])
  )
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          format: "binary",
        },
        requirements: {
          type: "string",
          format: "binary",
        },
      },
      required: ['code', 'requirements'], // This makes all fields required

    },
  })
  updateMLEngine(
    @Param("id") id: string,
    @UploadedFiles()
    files: {
      code?: Express.Multer.File[];
      requirements?: Express.Multer.File[];
    }
  ) {
    if (!files.code || !files.requirements) {
      throw new Error("Missing code or requirements file");
    }
    const codeStream = Readable.from(files.code[0].buffer);
    const requirementsStream = Readable.from(files.requirements[0].buffer);

    return this.mindsdbService.updateMLEngine(
      id,
      codeStream,
      requirementsStream
    );
  }
}
