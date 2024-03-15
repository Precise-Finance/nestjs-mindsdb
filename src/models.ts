import { Granularity, IModel } from "./mindsdb.models";

export const Models = new Map<string, IModel>([
  [
    "balance_auto",
    {
      tag: "v1.0.0",
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
        integration: '',
      },
    },
  ],
  [
    "balance_gluon",
    {
      tag: "v1.0.0",
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
        integration: '',
      },
    },
  ],
]);
