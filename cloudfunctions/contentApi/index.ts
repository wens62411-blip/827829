import {
  CLOUD_ACTIONS_BY_FUNCTION,
  type CloudAction,
} from '../../miniprogram/shared/contracts';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import ContentRuntime = require('./service');

export const ACTIONS = CLOUD_ACTIONS_BY_FUNCTION.contentApi satisfies readonly CloudAction[];

export const endpoint = createNotImplementedEndpoint('contentApi', ACTIONS);
export const main = endpoint.main;

/**
 * The repository is intentionally LOCAL_ONLY and has no authorized CloudBase
 * environment. `main` therefore keeps the frozen NOT_IMPLEMENTED boundary.
 * Integration supplies real database/runtime capabilities through this
 * factory; tests use the same interface with an in-memory transaction runner.
 */
export const createContentApiEndpoint = ContentRuntime.createContentApiEndpoint;

export type ContentApiDependencies = ContentRuntime.ContentApiDependencies;
export type ContentApiEndpoint = ContentRuntime.ContentApiEndpoint;
