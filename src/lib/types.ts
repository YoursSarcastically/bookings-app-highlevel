/* Shapes returned by the Bookings API (server/server.py → state()) */
export type Level = "owner" | "desk" | "staff";
export type ApptStatus = "booked" | "arrived" | "done" | "noshow" | "cancelled";
export type Source = "online" | "walkin" | "google" | "phone";

export interface Hours {
  [dow: string]: [string, string] | null;
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  color: string;
  pin: string;
  rate: number;
  clockIn: string | null;
  hours: Hours;
  shifts: [string, string][];
  hlUserId?: string | null;
  hlCalendarId?: string | null;
  level: Level;
  email: string;
  phone: string;
}
export interface Addon {
  name: string;
  price: number;
  min: number;
}
export interface Service {
  id: string;
  cat: string;
  name: string;
  dur: number;
  price: number;
  em: string;
  online: boolean;
  staff: string[];
  gap: number;
  deposit: number;
  addons: Addon[];
  descr: string;
  hlCalendarId?: string | null;
  hlProductId?: string | null;
}
export interface Klass {
  id: string;
  name: string;
  time: string;
  dur: number;
  cap: number;
  price: number;
  staffId: string;
  days: number[];
  online: boolean;
  spots: boolean;
  descr: string;
}
export interface Pass {
  id: string;
  name: string;
  type: "pack" | "unlimited" | "intro";
  credits: number | null;
  price: number;
  days: number;
  svc?: string | null;
  desc?: string | null;
  hlProductId?: string | null;
}
export interface ClientPass {
  id: string;
  passId: string;
  remaining: number | null;
  expires: string;
  status: "active" | "frozen" | "cancelled";
  nextBilling?: string | null;
  autoRenew: boolean;
  frozenUntil?: string | null;
  price?: number | null;
}
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  notes: string;
  tags: string[];
  birthday: string;
  preferredStaff: string;
  card: { brand: string; last4: string } | null;
  created: string;
  passes: ClientPass[];
  hlContactId?: string | null;
  hlOpportunityId?: string | null;
}
export interface Appt {
  id: string;
  date: string;
  time: string;
  serviceId: string;
  staffId: string;
  clientId: string;
  status: ApptStatus;
  source: Source;
  total: number;
  tip: number;
  paid: boolean;
  deposit: number;
  fee: number;
  token: string | null;
  seriesId: string | null;
  addons: Addon[];
  notes: string;
  spot: number | null;
  hlEventId?: string | null;
}
export interface Sale {
  id: string;
  date: string;
  clientId: string | null;
  staffId: string | null;
  label: string;
  total: number;
  tip: number;
  method: string;
  refundOf?: string | null;
  appointmentId?: string | null;
  note: string;
  at: string;
}
export interface WaitlistEntry {
  id: string;
  clientId: string;
  classId: string | null;
  serviceId: string | null;
  staffId: string | null;
  date: string;
  status: "waiting" | "offered" | "booked";
  created: string;
}
export interface Block {
  id: string;
  staffId: string | null;
  date: string;
  start: string;
  end: string;
  kind: "block" | "timeoff";
  reason: string;
}
export interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initial: number;
  clientId: string | null;
  created: string;
}
export interface AuditRow {
  ts: string;
  actor: string | null;
  action: string;
  detail: string;
}
export interface Page {
  id: string;
  name: string;
  on: boolean;
  note: string;
}
export interface Vocab {
  label: string;
  emoji: string;
  section: string;
  biz: string;
  city: string;
  staff: string;
  staffOne: string;
  svc: string;
  hasClasses: boolean;
  passWord: string;
  rush: string;
}
export interface Features {
  booking: boolean;
  passes: boolean;
  classes: boolean;
  tips: boolean;
  reminders: boolean;
  google: boolean;
}
export interface Policy {
  noshow_fee: number;
  late_cancel_fee: number;
  deposit_default: number;
  reminder_hours: number;
  require_card_online: boolean;
  waitlist: boolean;
  self_service: boolean;
}
export interface LocationRef {
  id: string;
  slug: string;
  type: string;
  name: string;
  city: string;
  label: string;
  emoji: string;
}
export interface HLSummary {
  configured: boolean;
  linked: boolean;
  sync: Record<string, boolean>;
  contacts: number;
  appts: number;
  staff: number;
  services: number;
  products: number;
  opportunities: number;
  records: number;
}

export interface State {
  id: string;
  slug: string;
  type: string;
  name: string;
  city: string;
  vocab: Vocab;
  status: "open" | "busy" | "closed";
  onboarded: boolean;
  rules: { cancelHours: number; slot: number; open: string; close: string; deposit: number };
  features: Features;
  policy: Policy;
  brand: Record<string, unknown>;
  staff: Staff[];
  services: Service[];
  classes: Klass[];
  passes: Pass[];
  clients: Client[];
  appts: Appt[];
  sales: Sale[];
  attend: Record<string, string[]>;
  spots: Record<string, Record<string, number>>;
  waitlist: WaitlistEntry[];
  blocks: Block[];
  giftcards: GiftCard[];
  audit: AuditRow[];
  pages: Page[];
  hl: HLSummary;
  hlFunnel: { id: string; name: string; url: string } | null;
  today: string;
  now: string;
  locations: LocationRef[];
}
export interface Me {
  id: string;
  name: string;
  role: string;
  level: Level;
  color: string;
}
export interface Insights {
  days: number;
  revenue: number;
  revenue_by_day: { date: string; value: number }[];
  visits: number;
  noshow_rate: number;
  avg_ticket: number;
  by_source: Record<string, number>;
  top_services: [string, number][];
  returning: number;
  unique_clients: number;
  by_staff: [string, number][];
  class_fill: { name: string; rate: number; held: number }[];
  lapsed: { id: string; name: string }[];
  lapsed_count: number;
  active_memberships: number;
  mrr: number;
  by_method: [string, number][];
}
export interface PublicInfo {
  name: string;
  city: string;
  slug: string;
  status: string;
  type: string;
  vocab: Vocab;
  services: Pick<
    Service,
    "id" | "cat" | "name" | "dur" | "price" | "em" | "staff" | "deposit" | "addons" | "descr"
  >[];
  classes: Pick<Klass, "id" | "name" | "time" | "dur" | "cap" | "price" | "days" | "staffId">[];
  staff: Pick<Staff, "id" | "name" | "role" | "color">[];
  pages: Record<string, boolean>;
  features: Features;
  cancelHours: number;
  today: string;
  website?: string | null;
  policy: { cancel_hours: number; late_fee: number; noshow_fee: number; require_card: boolean };
}
export interface ManageInfo {
  business: string;
  service: string;
  staff: string;
  staff_id: string;
  service_id: string;
  client: string;
  date: string;
  time: string;
  dur: number;
  price: number;
  status: ApptStatus;
  deposit: number;
  cancel_hours: number;
  late_fee: number;
  late: boolean;
  self_service: boolean;
  today: string;
}
