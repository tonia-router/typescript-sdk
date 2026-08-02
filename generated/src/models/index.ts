/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface CatalogueOffer
 */
export interface CatalogueOffer {
    /**
     * 
     * @type {string}
     * @memberof CatalogueOffer
     */
    offerId: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueOffer
     */
    productId: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueOffer
     */
    status: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueOffer
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueOffer
     */
    credentialMode: string;
    /**
     * 
     * @type {boolean}
     * @memberof CatalogueOffer
     */
    _public: boolean;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof CatalogueOffer
     */
    trial: { [key: string]: any; };
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof CatalogueOffer
     */
    entitlementTemplate: { [key: string]: any; };
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof CatalogueOffer
     */
    components: Array<{ [key: string]: any; }>;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof CatalogueOffer
     */
    discounts: { [key: string]: any; };
    /**
     * 
     * @type {Array<number>}
     * @memberof CatalogueOffer
     */
    managedCreditTopupAmountsCadCents?: Array<number>;
}
/**
 * 
 * @export
 * @interface CatalogueProduct
 */
export interface CatalogueProduct {
    /**
     * 
     * @type {string}
     * @memberof CatalogueProduct
     */
    productId: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueProduct
     */
    label: string;
    /**
     * 
     * @type {string}
     * @memberof CatalogueProduct
     */
    stripeProductLookupKey: string;
    /**
     * 
     * @type {Array<CatalogueOffer>}
     * @memberof CatalogueProduct
     */
    offers: Array<CatalogueOffer>;
}
/**
 * 
 * @export
 * @interface ConversationAppendRequest
 */
export interface ConversationAppendRequest {
    [key: string]: any | any;
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof ConversationAppendRequest
     */
    messages: Array<{ [key: string]: any; }>;
}
/**
 * 
 * @export
 * @interface ConversationCreateRequest
 */
export interface ConversationCreateRequest {
    [key: string]: any | any;
    /**
     * 
     * @type {string}
     * @memberof ConversationCreateRequest
     */
    title?: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationCreateRequest
     */
    model?: string;
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof ConversationCreateRequest
     */
    messages?: Array<{ [key: string]: any; }>;
}
/**
 * 
 * @export
 * @interface ConversationDetail
 */
export interface ConversationDetail {
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    conversationId: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    model: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    createdAt: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    updatedAt: string;
    /**
     * 
     * @type {number}
     * @memberof ConversationDetail
     */
    messageCount: number;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetail
     */
    archivedAt: string;
    /**
     * 
     * @type {Array<ConversationDetailAllOfMessages>}
     * @memberof ConversationDetail
     */
    messages: Array<ConversationDetailAllOfMessages>;
}
/**
 * 
 * @export
 * @interface ConversationDetailAllOfMessages
 */
export interface ConversationDetailAllOfMessages {
    /**
     * 
     * @type {number}
     * @memberof ConversationDetailAllOfMessages
     */
    seq: number;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetailAllOfMessages
     */
    role: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetailAllOfMessages
     */
    content: string;
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof ConversationDetailAllOfMessages
     */
    attachments: Array<{ [key: string]: any; }>;
    /**
     * 
     * @type {string}
     * @memberof ConversationDetailAllOfMessages
     */
    createdAt: string;
}
/**
 * 
 * @export
 * @interface ConversationExport
 */
export interface ConversationExport {
    /**
     * 
     * @type {string}
     * @memberof ConversationExport
     */
    tenantId: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationExport
     */
    memberId: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationExport
     */
    exportedAt: string;
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof ConversationExport
     */
    conversations: Array<{ [key: string]: any; }>;
}
/**
 * 
 * @export
 * @interface ConversationList
 */
export interface ConversationList {
    /**
     * 
     * @type {string}
     * @memberof ConversationList
     */
    object: ConversationListObjectEnum;
    /**
     * 
     * @type {Array<ConversationSummary>}
     * @memberof ConversationList
     */
    data: Array<ConversationSummary>;
}


/**
 * @export
 */
export const ConversationListObjectEnum = {
    List: 'list'
} as const;
export type ConversationListObjectEnum = typeof ConversationListObjectEnum[keyof typeof ConversationListObjectEnum];

/**
 * 
 * @export
 * @interface ConversationSummary
 */
export interface ConversationSummary {
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    conversationId: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    title: string | null;
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    model: string | null;
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    createdAt: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    updatedAt: string;
    /**
     * 
     * @type {number}
     * @memberof ConversationSummary
     */
    messageCount: number;
    /**
     * 
     * @type {string}
     * @memberof ConversationSummary
     */
    archivedAt: string | null;
}
/**
 * 
 * @export
 * @interface ConversationsAppend200Response
 */
export interface ConversationsAppend200Response {
    /**
     * 
     * @type {string}
     * @memberof ConversationsAppend200Response
     */
    conversationId: string;
    /**
     * 
     * @type {number}
     * @memberof ConversationsAppend200Response
     */
    messageCount: number;
}
/**
 * 
 * @export
 * @interface ConversationsAuthError
 */
export interface ConversationsAuthError {
    /**
     * 
     * @type {ConversationsAuthErrorError}
     * @memberof ConversationsAuthError
     */
    error: ConversationsAuthErrorError;
}
/**
 * Thinner than runtime auth — no code, no retryable
 * @export
 * @interface ConversationsAuthErrorError
 */
export interface ConversationsAuthErrorError {
    /**
     * 
     * @type {string}
     * @memberof ConversationsAuthErrorError
     */
    type: ConversationsAuthErrorErrorTypeEnum;
}


/**
 * @export
 */
export const ConversationsAuthErrorErrorTypeEnum = {
    AuthenticationError: 'authentication_error'
} as const;
export type ConversationsAuthErrorErrorTypeEnum = typeof ConversationsAuthErrorErrorTypeEnum[keyof typeof ConversationsAuthErrorErrorTypeEnum];

/**
 * 
 * @export
 * @interface ConversationsDelete200Response
 */
export interface ConversationsDelete200Response {
    /**
     * 
     * @type {boolean}
     * @memberof ConversationsDelete200Response
     */
    deleted: ConversationsDelete200ResponseDeletedEnum;
}


/**
 * @export
 */
export const ConversationsDelete200ResponseDeletedEnum = {
    True: true
} as const;
export type ConversationsDelete200ResponseDeletedEnum = typeof ConversationsDelete200ResponseDeletedEnum[keyof typeof ConversationsDelete200ResponseDeletedEnum];

/**
 * 
 * @export
 * @interface ConversationsDeleteHistory200Response
 */
export interface ConversationsDeleteHistory200Response {
    /**
     * 
     * @type {number}
     * @memberof ConversationsDeleteHistory200Response
     */
    deletedConversations: number;
}
/**
 * 
 * @export
 * @interface ConversationsPolicyError
 */
export interface ConversationsPolicyError {
    /**
     * 
     * @type {ConversationsPolicyErrorError}
     * @memberof ConversationsPolicyError
     */
    error: ConversationsPolicyErrorError;
}
/**
 * Thinner than runtime policy_block (no detail/efvp/status/dlp/media)
 * @export
 * @interface ConversationsPolicyErrorError
 */
export interface ConversationsPolicyErrorError {
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    type: ConversationsPolicyErrorErrorTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    code: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    law25Article?: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    scopeField?: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    requested?: string;
    /**
     * 
     * @type {string}
     * @memberof ConversationsPolicyErrorError
     */
    allowed?: string;
}


/**
 * @export
 */
export const ConversationsPolicyErrorErrorTypeEnum = {
    PolicyBlock: 'policy_block'
} as const;
export type ConversationsPolicyErrorErrorTypeEnum = typeof ConversationsPolicyErrorErrorTypeEnum[keyof typeof ConversationsPolicyErrorErrorTypeEnum];

/**
 * 
 * @export
 * @interface ConversationsStructuredError
 */
export interface ConversationsStructuredError {
    /**
     * 
     * @type {ConversationsStructuredErrorError}
     * @memberof ConversationsStructuredError
     */
    error: ConversationsStructuredErrorError;
}
/**
 * 
 * @export
 * @interface ConversationsStructuredErrorError
 */
export interface ConversationsStructuredErrorError {
    [key: string]: any | any;
    /**
     * 
     * @type {string}
     * @memberof ConversationsStructuredErrorError
     */
    type: ConversationsStructuredErrorErrorTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof ConversationsStructuredErrorError
     */
    code: string;
}


/**
 * @export
 */
export const ConversationsStructuredErrorErrorTypeEnum = {
    InvalidRequestError: 'invalid_request_error',
    EntitlementError: 'entitlement_error'
} as const;
export type ConversationsStructuredErrorErrorTypeEnum = typeof ConversationsStructuredErrorErrorTypeEnum[keyof typeof ConversationsStructuredErrorErrorTypeEnum];

/**
 * 
 * @export
 * @interface ConversationsUpdateRequest
 */
export interface ConversationsUpdateRequest {
    /**
     * 
     * @type {boolean}
     * @memberof ConversationsUpdateRequest
     */
    archived: boolean;
}
/**
 * chat_200 entitlement block carrier
 * @export
 * @interface EntitlementBlockCarrier
 */
export interface EntitlementBlockCarrier {
    /**
     * 
     * @type {string}
     * @memberof EntitlementBlockCarrier
     */
    type: EntitlementBlockCarrierTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof EntitlementBlockCarrier
     */
    code: string;
    /**
     * 
     * @type {string}
     * @memberof EntitlementBlockCarrier
     */
    scope: EntitlementBlockCarrierScopeEnum;
    /**
     * 
     * @type {boolean}
     * @memberof EntitlementBlockCarrier
     */
    retryable: boolean;
    /**
     * 
     * @type {string}
     * @memberof EntitlementBlockCarrier
     */
    message: string;
    /**
     * 
     * @type {string}
     * @memberof EntitlementBlockCarrier
     */
    action: string;
}


/**
 * @export
 */
export const EntitlementBlockCarrierTypeEnum = {
    EntitlementBlock: 'entitlement_block'
} as const;
export type EntitlementBlockCarrierTypeEnum = typeof EntitlementBlockCarrierTypeEnum[keyof typeof EntitlementBlockCarrierTypeEnum];

/**
 * @export
 */
export const EntitlementBlockCarrierScopeEnum = {
    Member: 'member',
    Organization: 'organization',
    Operator: 'operator'
} as const;
export type EntitlementBlockCarrierScopeEnum = typeof EntitlementBlockCarrierScopeEnum[keyof typeof EntitlementBlockCarrierScopeEnum];

/**
 * @type InlineObject
 * 
 * @export
 */
export type InlineObject = ConversationsAuthError | ConversationsPolicyError | ConversationsStructuredError;
/**
 * Provider-native body. When policy/entitlement blocks render as
 * chat_200, the same body also carries `_tonia_policy_block` or
 * `_tonia_entitlement_block` — SDKs must detect and raise.
 * 
 * @export
 * @interface PassthroughOrBlockResponse
 */
export interface PassthroughOrBlockResponse {
    [key: string]: any | any;
    /**
     * 
     * @type {PolicyBlockCarrier}
     * @memberof PassthroughOrBlockResponse
     */
    toniaPolicyBlock?: PolicyBlockCarrier;
    /**
     * 
     * @type {EntitlementBlockCarrier}
     * @memberof PassthroughOrBlockResponse
     */
    toniaEntitlementBlock?: EntitlementBlockCarrier;
}
/**
 * chat_200 policy block carrier (no retryable)
 * @export
 * @interface PolicyBlockCarrier
 */
export interface PolicyBlockCarrier {
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    code: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    law25Article?: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    efvpSection?: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    scopeField?: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    detail?: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    message?: string;
    /**
     * 
     * @type {string}
     * @memberof PolicyBlockCarrier
     */
    action?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof PolicyBlockCarrier
     */
    categories?: Array<string>;
    /**
     * 
     * @type {number}
     * @memberof PolicyBlockCarrier
     */
    hitCount?: number;
    /**
     * 
     * @type {Array<{ [key: string]: any; }>}
     * @memberof PolicyBlockCarrier
     */
    details?: Array<{ [key: string]: any; }>;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PolicyBlockCarrier
     */
    media?: { [key: string]: any; };
}
/**
 * 
 * @export
 * @interface PublicCatalogue
 */
export interface PublicCatalogue {
    /**
     * 
     * @type {string}
     * @memberof PublicCatalogue
     */
    catalogueVersion: string;
    /**
     * 
     * @type {string}
     * @memberof PublicCatalogue
     */
    catalogueHash: string;
    /**
     * 
     * @type {Array<CatalogueProduct>}
     * @memberof PublicCatalogue
     */
    products: Array<CatalogueProduct>;
}
/**
 * 
 * @export
 * @interface PublicModelCategoryList
 */
export interface PublicModelCategoryList {
    /**
     * 
     * @type {string}
     * @memberof PublicModelCategoryList
     */
    object: PublicModelCategoryListObjectEnum;
    /**
     * 
     * @type {Array<PublicModelCategoryListDataInner>}
     * @memberof PublicModelCategoryList
     */
    data: Array<PublicModelCategoryListDataInner>;
}


/**
 * @export
 */
export const PublicModelCategoryListObjectEnum = {
    List: 'list'
} as const;
export type PublicModelCategoryListObjectEnum = typeof PublicModelCategoryListObjectEnum[keyof typeof PublicModelCategoryListObjectEnum];

/**
 * 
 * @export
 * @interface PublicModelCategoryListDataInner
 */
export interface PublicModelCategoryListDataInner {
    /**
     * 
     * @type {string}
     * @memberof PublicModelCategoryListDataInner
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelCategoryListDataInner
     */
    labelEn: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelCategoryListDataInner
     */
    labelFr: string;
    /**
     * 
     * @type {number}
     * @memberof PublicModelCategoryListDataInner
     */
    sortOrder: number;
    /**
     * 
     * @type {string}
     * @memberof PublicModelCategoryListDataInner
     */
    tone: string;
}
/**
 * 
 * @export
 * @interface PublicModelDetail
 */
export interface PublicModelDetail {
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    provider: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    displayName: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    object: PublicModelDetailObjectEnum;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    descriptionFr?: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    bestFor?: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    bestForFr?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof PublicModelDetail
     */
    categories: Array<string>;
    /**
     * 
     * @type {number}
     * @memberof PublicModelDetail
     */
    contextLength?: number | null;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    releaseDate?: string | null;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    modalities?: { [key: string]: any; } | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof PublicModelDetail
     */
    capabilities: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof PublicModelDetail
     */
    supportedParameters: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    channel: string;
    /**
     * 
     * @type {string}
     * @memberof PublicModelDetail
     */
    statusComponent: string;
    /**
     * 
     * @type {ReasoningDescriptor}
     * @memberof PublicModelDetail
     */
    reasoning?: ReasoningDescriptor;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    pricing: { [key: string]: any; };
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    performance?: { [key: string]: any; } | null;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    uptime?: { [key: string]: any; } | null;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    activity?: { [key: string]: any; } | null;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof PublicModelDetail
     */
    tools?: { [key: string]: any; } | null;
}


/**
 * @export
 */
export const PublicModelDetailObjectEnum = {
    Model: 'model'
} as const;
export type PublicModelDetailObjectEnum = typeof PublicModelDetailObjectEnum[keyof typeof PublicModelDetailObjectEnum];

/**
 * 
 * @export
 * @interface PublicModelList
 */
export interface PublicModelList {
    /**
     * 
     * @type {string}
     * @memberof PublicModelList
     */
    object: PublicModelListObjectEnum;
    /**
     * 
     * @type {Array<PublicModelDetail>}
     * @memberof PublicModelList
     */
    data: Array<PublicModelDetail>;
}


/**
 * @export
 */
export const PublicModelListObjectEnum = {
    List: 'list'
} as const;
export type PublicModelListObjectEnum = typeof PublicModelListObjectEnum[keyof typeof PublicModelListObjectEnum];

/**
 * 
 * @export
 * @interface PublicNotFoundError
 */
export interface PublicNotFoundError {
    /**
     * 
     * @type {string}
     * @memberof PublicNotFoundError
     */
    error: PublicNotFoundErrorErrorEnum;
}


/**
 * @export
 */
export const PublicNotFoundErrorErrorEnum = {
    NotFound: 'not_found'
} as const;
export type PublicNotFoundErrorErrorEnum = typeof PublicNotFoundErrorErrorEnum[keyof typeof PublicNotFoundErrorErrorEnum];

/**
 * 
 * @export
 * @interface PublicStatus
 */
export interface PublicStatus {
    /**
     * 
     * @type {string}
     * @memberof PublicStatus
     */
    service: string;
    /**
     * 
     * @type {string}
     * @memberof PublicStatus
     */
    status: PublicStatusStatusEnum;
    /**
     * 
     * @type {string}
     * @memberof PublicStatus
     */
    checkedAt: string;
    /**
     * 
     * @type {Array<PublicStatusComponentsInner>}
     * @memberof PublicStatus
     */
    components: Array<PublicStatusComponentsInner>;
}


/**
 * @export
 */
export const PublicStatusStatusEnum = {
    Operational: 'operational',
    Degraded: 'degraded',
    Outage: 'outage',
    NotConfigured: 'not_configured'
} as const;
export type PublicStatusStatusEnum = typeof PublicStatusStatusEnum[keyof typeof PublicStatusStatusEnum];

/**
 * 
 * @export
 * @interface PublicStatusComponentsInner
 */
export interface PublicStatusComponentsInner {
    /**
     * 
     * @type {string}
     * @memberof PublicStatusComponentsInner
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof PublicStatusComponentsInner
     */
    status: PublicStatusComponentsInnerStatusEnum;
    /**
     * 
     * @type {string}
     * @memberof PublicStatusComponentsInner
     */
    detail: string;
    /**
     * 
     * @type {string}
     * @memberof PublicStatusComponentsInner
     */
    checkedAt: string;
    /**
     * 
     * @type {boolean}
     * @memberof PublicStatusComponentsInner
     */
    _public: boolean;
}


/**
 * @export
 */
export const PublicStatusComponentsInnerStatusEnum = {
    Operational: 'operational',
    Degraded: 'degraded',
    Outage: 'outage',
    NotConfigured: 'not_configured'
} as const;
export type PublicStatusComponentsInnerStatusEnum = typeof PublicStatusComponentsInnerStatusEnum[keyof typeof PublicStatusComponentsInnerStatusEnum];

/**
 * tonia-native per-model reasoning effort descriptor
 * @export
 * @interface ReasoningDescriptor
 */
export interface ReasoningDescriptor {
    /**
     * Declared effort labels for this model
     * @type {Array<string>}
     * @memberof ReasoningDescriptor
     */
    efforts: Array<string>;
    /**
     * Default effort when the client omits reasoning_effort
     * @type {string}
     * @memberof ReasoningDescriptor
     */
    _default: string;
}
/**
 * 
 * @export
 * @interface RuntimeModel
 */
export interface RuntimeModel {
    /**
     * 
     * @type {string}
     * @memberof RuntimeModel
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof RuntimeModel
     */
    object: RuntimeModelObjectEnum;
    /**
     * 
     * @type {number}
     * @memberof RuntimeModel
     */
    contextLength: number | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof RuntimeModel
     */
    supportedParameters: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof RuntimeModel
     */
    capabilities?: Array<string>;
    /**
     * 
     * @type {ReasoningDescriptor}
     * @memberof RuntimeModel
     */
    reasoning?: ReasoningDescriptor;
    /**
     * Present for managed-priced models only
     * @type {{ [key: string]: any; }}
     * @memberof RuntimeModel
     */
    pricing?: { [key: string]: any; };
}


/**
 * @export
 */
export const RuntimeModelObjectEnum = {
    Model: 'model'
} as const;
export type RuntimeModelObjectEnum = typeof RuntimeModelObjectEnum[keyof typeof RuntimeModelObjectEnum];

/**
 * 
 * @export
 * @interface RuntimeModelList
 */
export interface RuntimeModelList {
    /**
     * 
     * @type {string}
     * @memberof RuntimeModelList
     */
    object: RuntimeModelListObjectEnum;
    /**
     * 
     * @type {Array<RuntimeModel>}
     * @memberof RuntimeModelList
     */
    data: Array<RuntimeModel>;
}


/**
 * @export
 */
export const RuntimeModelListObjectEnum = {
    List: 'list'
} as const;
export type RuntimeModelListObjectEnum = typeof RuntimeModelListObjectEnum[keyof typeof RuntimeModelListObjectEnum];

/**
 * 
 * @export
 * @interface StructuredError
 */
export interface StructuredError {
    [key: string]: any | any;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    type: StructuredErrorTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    code?: string;
    /**
     * Present on runtime hard errors except policy_block
     * @type {boolean}
     * @memberof StructuredError
     */
    retryable?: boolean;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    scope?: StructuredErrorScopeEnum;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    message?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    provider?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    detail?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    docs?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    law25Article?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    efvpSection?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    scopeField?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    requested?: string;
    /**
     * 
     * @type {string}
     * @memberof StructuredError
     */
    allowed?: string;
    /**
     * 
     * @type {number}
     * @memberof StructuredError
     */
    status?: number;
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof StructuredError
     */
    dlp?: { [key: string]: any; };
    /**
     * 
     * @type {{ [key: string]: any; }}
     * @memberof StructuredError
     */
    media?: { [key: string]: any; };
}


/**
 * @export
 */
export const StructuredErrorTypeEnum = {
    AuthenticationError: 'authentication_error',
    BillingError: 'billing_error',
    EntitlementError: 'entitlement_error',
    InvalidRequestError: 'invalid_request_error',
    ByokKeyMissing: 'byok_key_missing',
    PolicyBlock: 'policy_block',
    TenantUpstreamBlocked: 'tenant_upstream_blocked',
    ManagedCredentialUnavailable: 'managed_credential_unavailable'
} as const;
export type StructuredErrorTypeEnum = typeof StructuredErrorTypeEnum[keyof typeof StructuredErrorTypeEnum];

/**
 * @export
 */
export const StructuredErrorScopeEnum = {
    Member: 'member',
    Organization: 'organization',
    Operator: 'operator'
} as const;
export type StructuredErrorScopeEnum = typeof StructuredErrorScopeEnum[keyof typeof StructuredErrorScopeEnum];

/**
 * 
 * @export
 * @interface StructuredErrorEnvelope
 */
export interface StructuredErrorEnvelope {
    /**
     * 
     * @type {StructuredError}
     * @memberof StructuredErrorEnvelope
     */
    error: StructuredError;
}
