
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  status: 'status',
  planId: 'planId',
  stripeCustomerId: 'stripeCustomerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreSettingsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  storeCode: 'storeCode',
  roundingUnit: 'roundingUnit',
  roundingThreshold: 'roundingThreshold',
  taxRate: 'taxRate',
  serviceRate: 'serviceRate',
  shiftCycleDays: 'shiftCycleDays',
  dailyCloseTime: 'dailyCloseTime',
  timezone: 'timezone',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  loginId: 'loginId',
  passwordHash: 'passwordHash',
  role: 'role',
  status: 'status',
  passwordChangedAt: 'passwordChangedAt',
  createdAt: 'createdAt'
};

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  displayName: 'displayName',
  realName: 'realName',
  dateOfBirth: 'dateOfBirth',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  joinDate: 'joinDate',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompensationPlanScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  type: 'type',
  hourlyRate: 'hourlyRate',
  commissionRate: 'commissionRate',
  salesBackRate: 'salesBackRate',
  drinkBackRate: 'drinkBackRate',
  jonaiBackRate: 'jonaiBackRate',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo'
};

exports.Prisma.ShiftEntryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  targetDate: 'targetDate',
  isWorking: 'isWorking',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  submissionNote: 'submissionNote',
  managerNote: 'managerNote',
  submittedAt: 'submittedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PunchEventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  punchType: 'punchType',
  punchedAt: 'punchedAt',
  businessDate: 'businessDate'
};

exports.Prisma.CastCheckoutScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  businessDate: 'businessDate',
  checkoutTime: 'checkoutTime',
  setBy: 'setBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  aliasName: 'aliasName',
  realName: 'realName',
  dateOfBirth: 'dateOfBirth',
  contactPhone: 'contactPhone',
  contactEmail: 'contactEmail',
  memo: 'memo',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerMergeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  targetCustomerId: 'targetCustomerId',
  sourceCustomerId: 'sourceCustomerId',
  mergedAt: 'mergedAt'
};

exports.Prisma.PriceItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemCode: 'itemCode',
  name: 'name',
  category: 'category',
  chargeType: 'chargeType',
  durationMinutes: 'durationMinutes',
  applyPerPerson: 'applyPerPerson',
  defaultPrice: 'defaultPrice',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.SalesSlipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  businessDate: 'businessDate',
  customerId: 'customerId',
  tableNumber: 'tableNumber',
  headcount: 'headcount',
  mainCastId: 'mainCastId',
  subtotal: 'subtotal',
  serviceTaxAmount: 'serviceTaxAmount',
  totalRounded: 'totalRounded',
  status: 'status',
  closedAt: 'closedAt',
  closedBy: 'closedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesLineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  slipId: 'slipId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  lineTotal: 'lineTotal',
  createdAt: 'createdAt'
};

exports.Prisma.DrinkCountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  businessDate: 'businessDate',
  accountId: 'accountId',
  count: 'count',
  updatedAt: 'updatedAt'
};

exports.Prisma.DailyCloseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  businessDate: 'businessDate',
  status: 'status',
  closedBy: 'closedBy',
  closedAt: 'closedAt'
};

exports.Prisma.MonthlyCloseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  month: 'month',
  status: 'status',
  closedBy: 'closedBy',
  closedAt: 'closedAt'
};

exports.Prisma.ChangeRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  targetType: 'targetType',
  targetId: 'targetId',
  requestType: 'requestType',
  status: 'status',
  reason: 'reason',
  requestedBy: 'requestedBy',
  requestedAt: 'requestedAt',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  actorId: 'actorId',
  actorRole: 'actorRole',
  actionType: 'actionType',
  targetType: 'targetType',
  targetId: 'targetId',
  beforeData: 'beforeData',
  afterData: 'afterData',
  requestId: 'requestId',
  correlationId: 'correlationId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  type: 'type',
  title: 'title',
  body: 'body',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price: 'price',
  maxStores: 'maxStores',
  maxUsers: 'maxUsers',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlanFeatureScalarFieldEnum = {
  planId: 'planId',
  featureKey: 'featureKey',
  enabled: 'enabled'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  status: 'status',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillingHistoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  amount: 'amount',
  status: 'status',
  paidAt: 'paidAt'
};

exports.Prisma.StripeEventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  StoreSettings: 'StoreSettings',
  Account: 'Account',
  UserProfile: 'UserProfile',
  CompensationPlan: 'CompensationPlan',
  ShiftEntry: 'ShiftEntry',
  PunchEvent: 'PunchEvent',
  CastCheckout: 'CastCheckout',
  Customer: 'Customer',
  CustomerMerge: 'CustomerMerge',
  PriceItem: 'PriceItem',
  SalesSlip: 'SalesSlip',
  SalesLine: 'SalesLine',
  DrinkCount: 'DrinkCount',
  DailyClose: 'DailyClose',
  MonthlyClose: 'MonthlyClose',
  ChangeRequest: 'ChangeRequest',
  AuditLog: 'AuditLog',
  Notification: 'Notification',
  Plan: 'Plan',
  PlanFeature: 'PlanFeature',
  Subscription: 'Subscription',
  BillingHistory: 'BillingHistory',
  StripeEvent: 'StripeEvent'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
