/** Public Managed-SKU channel. Pass returns this object, not a string. */
export type PublicChannel = {
  managed_available: boolean;
  byok_available: boolean;
  roster_group: string;
  jurisdiction: string;
  wire: string;
  counterparty: "direct_lab" | "alibaba_model_studio" | "aws_bedrock_byok";
};

/** Plan flags on a public catalogue offer. */
export type EntitlementTemplate = {
  seats_per_pack: number;
  request_quota_per_pack: number;
  managed_budget_cents: number;
  managed_credit_cents: number;
  media_guard: boolean;
  team_management: boolean;
  on_prem: boolean;
  image_generation: boolean;
  chat_included: boolean;
};

export type CatalogueOffer = {
  offer_id: string;
  product_id: string;
  status: string;
  label: string;
  credential_mode: string;
  public: boolean;
  entitlement_template: EntitlementTemplate;
  components: Record<string, unknown>[];
  managed_credit_topup_amounts_cad_cents?: number[];
};

export type CatalogueProduct = {
  product_id: string;
  label: string;
  stripe_product_lookup_key: string;
  offers: CatalogueOffer[];
};

export type PublicCatalogue = {
  catalogue_version: string;
  catalogue_hash: string;
  products: CatalogueProduct[];
};

export type ReasoningDescriptor = {
  efforts: string[];
  default: string;
};

export type CustomerSurface = {
  family: "text" | "image" | "speech" | "transcription" | "embeddings" | "rerank";
  path: string;
  sdk: string;
  body: string;
  edit_path: string | null;
};

export type PublicModel = {
  id: string;
  provider: string;
  display_name: string;
  object: "model";
  categories: string[];
  capabilities: string[];
  supported_parameters: string[];
  channel: PublicChannel;
  pricing: Record<string, unknown>;
  status_component: string;
  description?: string;
  description_fr?: string;
  best_for?: string;
  best_for_fr?: string;
  context_length?: number | null;
  release_date?: string | null;
  modalities?: Record<string, unknown> | null;
  reasoning?: ReasoningDescriptor;
  performance?: Record<string, unknown> | null;
  uptime?: Record<string, unknown> | null;
  activity?: Record<string, unknown> | null;
  tools?: Record<string, unknown> | null;
  surface?: CustomerSurface;
};

export type PublicModelList = {
  object: "list";
  data: PublicModel[];
};

export type RuntimeModel = {
  id: string;
  object: "model";
  context_length: number | null;
  supported_parameters: string[];
  capabilities?: string[];
  modalities?: Record<string, unknown>;
  reasoning?: ReasoningDescriptor;
  pricing?: Record<string, unknown>;
  surface?: CustomerSurface;
};

export type RuntimeModelList = {
  object: "list";
  data: RuntimeModel[];
};
