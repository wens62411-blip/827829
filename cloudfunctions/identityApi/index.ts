import {
  CLOUD_ACTIONS_BY_FUNCTION,
  type CloudAction,
} from '../../miniprogram/shared/contracts';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import IdentityDomain = require('./domain');
import IdentityRuntime = require('./service');

export const ACTIONS = CLOUD_ACTIONS_BY_FUNCTION.identityApi satisfies readonly CloudAction[];
export const WRITE_ACTIONS = IdentityRuntime.IDENTITY_WRITE_ACTIONS;

// The frozen default remains fail-closed until final integration installs a
// real CloudBase/WX runtime adapter. The injectable factory below contains the
// implemented action logic and never falls back to an in-memory production path.
export const endpoint = createNotImplementedEndpoint('identityApi', ACTIONS);
export const main = endpoint.main;

export const createIdentityEndpoint = IdentityRuntime.createIdentityEndpoint;
export const IDENTITY_RUNTIME_MODES = IdentityRuntime.IDENTITY_RUNTIME_MODES;

// Named domain exports keep the injectable-runtime test and adapter surface
// explicit while the package main remains the frozen fail-closed entrypoint.
export const DEFAULT_PROFILE_VISIBILITY = IdentityDomain.DEFAULT_PROFILE_VISIBILITY;
export const DEFAULT_SHARE_ALLOWED_FIELDS = IdentityDomain.DEFAULT_SHARE_ALLOWED_FIELDS;
export const PROFILE_FIELD_KEYS = IdentityDomain.PROFILE_FIELD_KEYS;
export const PERMANENTLY_PRIVATE_FIELD_KEYS = IdentityDomain.PERMANENTLY_PRIVATE_FIELD_KEYS;
export const SHARE_ALLOWED_FIELD_KEYS = IdentityDomain.SHARE_ALLOWED_FIELD_KEYS;
export const hashPrivateIdentifier = IdentityDomain.hashPrivateIdentifier;
export const hashShareToken = IdentityDomain.hashShareToken;
export const selectVisibleProfileFields = IdentityDomain.selectVisibleProfileFields;
export const validateProfileVisibility = IdentityDomain.validateProfileVisibility;

export type IdentityAction = IdentityRuntime.IdentityAction;
export type IdentityEndpoint = IdentityRuntime.IdentityEndpoint;
