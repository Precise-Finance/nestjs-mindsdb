# MindsDB NestJS Module

A NestJS module for integrating with MindsDB. This allows for easy model management and prediction within your NestJS application.

## Installation

```bash
npm install nestjs-mindsdb
```

## Defining Models

Models in MindsDB are described through the `IModel` interface. Here's how you can define your models:

```typescript
import { Granularity, IModel } from "./mindsdb.models";

export const Models = new Map<string, IModel>([
  [
    "balance_auto",
    {
      name: "balance_auto",
      granularity: Granularity.day,
      targetColumn: "sum",
      predictOptions: {
        join: "views.enriched_balance",
        where: ["t.customerId = $CUSTOMER_ID$", "t.date > $DATE$"],
      },
      trainingOptions: {
        select: "select * from enriched_balance",
        groupBy: "customerId",
        orderBy: "date",
        horizon: 60,
        window: 90,
        // using: {
        //   submodels: [{ module: 'GluonTSMixer', args: {} }],
        // },
      },
      finetuneOptions: {
        select: "select * from enriched_balance where customerId = $CUSTOMER_ID$ and date > $DATE$",
        integration: undefined,
      },
    },
  ],
  [
    "balance_gluon",
    {
      name: "balance_gluon",
      granularity: Granularity.day,
      targetColumn: "sum",
      view: {
        select: "select * from production.banking.enriched_balance",
        name: "balance_gluon_enriched_balance",
      },
      predictOptions: {
        join: "views.enriched_balance",
        where: ["t.customerId = $CUSTOMER_ID$", "t.date > $DATE$"],
      },
      trainingOptions: {
        select: "select * from balance_gluon_enriched_balance",
        groupBy: "customerId",
        orderBy: "date",
        horizon: 60,
        window: 90,
        // using: {
        //   submodels: [{ module: 'GluonTSMixer', args: {} }],
        // },
      },
      finetuneOptions: {
        select: "select * from balance_gluon_enriched_balance",
        integration: undefined,
      },
    },
  ],
]);

```

Placeholders such as `$CUSTOMER_ID$` and `$DATE$` can be used in the model definition. These will be replaced when you're making predictions.

---

## Usage

### Setting up the Controller

To expose your models through a RESTful API, extend the `AbstractMindsdbController` and use NestJS's `@Controller` decorator. This controller will automatically have all the endpoints corresponding to the methods in the `AbstractMindsdbController`.

```typescript
import { Controller } from '@nestjs/common';
import { MindsdbService } from 'nestjs-mindsdb';
import { AbstractMindsdbController } from 'nestjs-mindsdb';

@Controller('mindsdb')
export class MindsdbController extends AbstractMindsdbController {
  constructor(mindsdbService: MindsdbService) {
    super(mindsdbService);
  }
}
```

### Using the MindsdbService

The `MindsdbService` provides several methods that correspond to different operations you can perform on your models.
If parameters are not provided will use the one's defined on the IModel object for each.

#### 1. Create a Model

```typescript
const createDto = new CreateMindsdbDto();
createDto.name = 'balance_auto';
mindsdbService.create(createDto);
```

#### 2. Predict Using a Model

```typescript
const predictDto = new PredictMindsdbDto();
predictDto.join = "views.enriched_balance";
predictDto.where = ["t.customerId = $CUSTOMER_ID$", "t.date > $DATE$"];
predictDto.limit = 100;
predictDto.params = {
  $CUSTOMER_ID$: 1234,
  $DATE$: new Date('2023-01-01')
};
mindsdbService.predict('balance_auto', predictDto);
```

#### 3. Fine-tune a Model

```typescript
const finetuneDto = new FinetuneMindsdbDto();
finetuneDto.select = "select * from enriched_balance where customerId = $CUSTOMER_ID$ and date > $DATE$";
finetuneDto.params = {
  $CUSTOMER_ID$: 1234,
  $DATE$: new Date('2023-01-01')
};
mindsdbService.finetune('balance_auto', finetuneDto);
```

#### 4. Retrain a Model

```typescript
const retrainDto = new RetrainMindsDbDto();
retrainDto.select = "select * from balance_gluon_enriched_balance";
retrainDto.groupBy = "customerId";
retrainDto.orderBy = "date";
retrainDto.window = 90;
retrainDto.horizon = 60;
mindsdbService.retrain('balance_auto', retrainDto);
```

#### 5. Retrieve All Models

```typescript
const allModels = mindsdbService.findAll();
```

#### 6. Retrieve a Specific Model

```typescript
mindsdbService.findOne('balance_auto');
```

#### 7. Remove a Model

```typescript
mindsdbService.remove('balance_auto');
```

---

Remember to adjust any paths, references, and examples according to your project structure and requirements.

## Configuration

To utilize MindsDB within your NestJS application, you have to set up the module. Given the nature of this module being dynamic, configurations are essential for its proper functioning. Here's a basic setup:

```typescript
import { MindsdbModule } from 'nestjs-mindsdb';
import { Models } from './path-to-your-models-definition';

@Module({
  imports: [MindsdbModule.forRoot(Models)],
})
export class AppModule {}
```
