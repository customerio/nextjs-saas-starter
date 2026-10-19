/**
 * Customer.io for this app. Server-only: every file here holds or uses keys.
 *
 * - config.ts         reads and checks the CUSTOMERIO_* environment variables
 * - clients.ts        builds Track API and App API clients for the right region
 * - errors.ts         turns failures into typed values, incl. "email not set up yet"
 * - signup.ts         identify, the signed_up event, and the welcome email
 * - welcome-email.ts  the inline welcome email content
 * - endpoints.ts      the URLs each step calls, for display
 */
export { describeEnv, getCustomerioConfig, ENV_VARS } from "./config";
export type { CustomerioConfig, CustomerioRegion, EnvVarInfo, EnvVarName } from "./config";
export { signupEndpoints } from "./endpoints";
export { classifyError, isEmailSetupFailure, isTemporaryFailure } from "./errors";
export type { CustomerioFailure, FailureKind } from "./errors";
export {
  SIGNED_UP_EVENT,
  defaultDeps,
  identifyPerson,
  recordSignup,
  sendWelcomeEmail,
  trackSignedUp,
} from "./signup";
export type { Person, SignupReport, SkipReason, StepResult } from "./signup";
