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
import CreateCallbackDto from "./dto/create-callback.dto";

@ApiTags("mindsdb")
export abstract class AbstractMindsdbController {
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

  @ApiBody({ type: PredictMindsdbDto })
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
  finetune(@Param("id") id: string, @Body() finetuneDto: FinetuneMindsdbDto) {
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
        options: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              properties: {
                model_name: {
                  type: 'string',
                  example: 'model_name',
                },
                project_name: {
                  type: 'string',
                  example: 'project_name',
                },
                new_status: {
                  type: 'array',
                  items: {
                    type: 'string',
                    example: 'new_status',
                  },
                },
              },
            },
            attempt: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  example: 1,
                },
                http_timeout: {
                  type: 'number',
                  example: 1,
                },
                interval: {
                  type: 'number',
                  example: 1,
                },
              },
            },
          },
        },
      },
      required: ['url'],
    },
  })
  
  async createCallback(@Body() body: CreateCallbackDto) {
    return this.mindsdbService.Client.Callbacks.createCallback(body.url, body.options);
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
        type: {
          type: 'string',
          enum: ['inhouse', 'venv'],
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
    @Body('type') type: 'inhouse'|'venv',
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
      requirementsStream,
      type
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
        type: {
          type: 'string',
          enum: ['inhouse', 'venv'],
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
      required: ['code', 'requirements'], // This makes all fields required

    },
  })
  updateMLEngine(
    @Param("id") id: string,
    @Body('type') type: 'inhouse'|'venv',
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
      requirementsStream,
      type,
    );
  }
}
