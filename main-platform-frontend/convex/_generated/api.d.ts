/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as applications from "../applications.js";
import type * as decisions from "../decisions.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as ml from "../ml.js";
import type * as organizations from "../organizations.js";
import type * as platformAuth from "../platformAuth.js";
import type * as riskPolicies from "../riskPolicies.js";
import type * as securitySettings from "../securitySettings.js";
import type * as sessionState from "../sessionState.js";
import type * as sessions from "../sessions.js";
import type * as support from "../support.js";
import type * as test from "../test.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  alerts: typeof alerts;
  applications: typeof applications;
  decisions: typeof decisions;
  events: typeof events;
  http: typeof http;
  messages: typeof messages;
  ml: typeof ml;
  organizations: typeof organizations;
  platformAuth: typeof platformAuth;
  riskPolicies: typeof riskPolicies;
  securitySettings: typeof securitySettings;
  sessionState: typeof sessionState;
  sessions: typeof sessions;
  support: typeof support;
  test: typeof test;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
