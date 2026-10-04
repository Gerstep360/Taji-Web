export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  tagline: string;
  description: string;
  price_bob: number | string;
  price_usd: number | string;
  billing_period: 'MONTHLY' | 'ANNUAL';
  max_units: number;
  max_residents: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  order: number;
}

export interface TenantSubscription {
  id: number | null;
  plan: SubscriptionPlan | null;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'NO_SUBSCRIPTION';
  status_label: string;
  is_valid: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  days_left: number;
  max_units: number;
  used_units: number;
  max_residents: number;
  used_residents: number;
}

export interface PaymentConfig {
  provider: string;
  publishable_key: string;
  currency: string;
}

export interface StripeIntentResponse {
  payment_id: number;
  provider: string;
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
  amount: number;
  currency: string;
  status: string;
  sandbox: boolean;
  plan_name: string;
  condominium_name: string;
}

export interface SaaSPayment {
  id: number;
  condominium_id: number;
  plan_id: number;
  plan_name: string;
  amount: number | string;
  currency: string;
  provider: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  payment_intent_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateCondominiumPayload {
  name?: string;
  legal_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  rules_summary?: string;
}

export interface SaaSCondominiumRegisterPayload {
  condominium_name: string;
  condominium_code?: string;
  address?: string;
  phone?: string;
  estimated_units?: number;
  admin_name: string;
  admin_document?: string;
  admin_email: string;
  admin_phone?: string;
  admin_password: string;
  plan_code: string;
  payment_method: 'TRIAL' | 'STRIPE';
  payment_id?: number | null;
}

export interface SaaSCondominiumRegisterResponse {
  message: string;
  user: any;
  condominium: any;
  subscription: {
    id: number;
    plan_name: string;
    status: string;
    days_left: number;
  };
  access: string;
  refresh: string;
}
