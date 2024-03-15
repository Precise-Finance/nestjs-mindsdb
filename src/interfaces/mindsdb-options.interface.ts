import { ConnectionOptions } from "mindsdb-js-sdk";
import { IModel } from "src/mindsdb.models";
import { ModuleMetadata } from "@nestjs/common";

export type MindsdbModuleConnectionOptions = {
  host: ConnectionOptions['host'];
  user: ConnectionOptions['user'];
  managed: ConnectionOptions['managed'];
  password: ConnectionOptions['password'];
};

export type MindsdbModuleOptions = {
  /**
   * The connection details for your MindsDB instance
   */
  connection: MindsdbModuleConnectionOptions;
  /**
   * The default project to use for MindsDB
   * The default project created by MindsDB is "mindsdb"
   */
  project: string;
  /**
   * Whether or not the project should be used as a prefix for the integration
   * @default false
   */
  projectAsIntegrationPrefix?: boolean;
  models: Map<string, IModel>;
};

export interface MindsdbModuleOptionsFactory {
  createMindsdbModuleOptions(): Promise<MindsdbModuleOptions> | MindsdbModuleOptions;
}

export interface MindsdbModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<MindsdbModuleOptions> | MindsdbModuleOptions;
  inject?: any[];
  extraProviders?: any[];
}
