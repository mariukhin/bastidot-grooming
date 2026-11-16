// Інтеграційні тести графіка грумера (SCRUM-58): типи винятків, права,
// журнал змін, записи поза графіком і прапорець onlineBooking.
//
// Лише локальна MongoDB і окрема база — інші тестові файли біжать паралельно
// у своїх процесах і чистять свою базу.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { MongoClient, ObjectId, type Db } from 'mongodb';

const MONGO_URL = process.env.TEST_MONGO_URL ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = 'bastidot_test_schedule';

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(MONGO_URL)) {
  throw new Error(`Тести ганяються лише на локальній MongoDB, отримано: ${MONGO_URL}`);
}

Object.assign(process.env, {
  APP_ENV: 'test',
  DB_HOST: 'unused.invalid',
  DB_USER: 'unused',
  DB_PASS: 'unused',
  DB_NAME,
  ACCESS_TOKEN_SECRET: 'test-access-secret',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  TELEGRAM_ENABLED: 'false',
  OTP_DELIVERY_ENABLED: 'false',
  REMINDER_IN_PROCESS: '',
});

const { createApp } = await import('../src/app.ts');
const { signToken } = await import('../src/shared/jwt.ts');
const { zonedToUtc, dateInZone } = await import('../src/features/schedule/time.ts');

type Role = 'client' | 'groomer' | 'admin';
type As = [ObjectId, Role];

const mongo = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
let db: Db;
let server: Server;
let baseUrl: string;

const ids = {
  admin: new ObjectId(),
  groomerA: new ObjectId(),
  groomerB: new ObjectId(),
  clientUser: new ObjectId(),
  client: new ObjectId(),
  pet: new ObjectId(),
};

const asAdmin: As = [ids.admin, 'admin'];
const asA: As = [ids.groomerA, 'groomer'];
const asB: As = [ids.groomerB, 'groomer'];
const asClient: As = [ids.clientUser, 'client'];

const DAY_MS = 24 * 60 * 60 * 1000;
const dayAhead = (n: number) => dateInZone(new Date(Date.now() + n * DAY_MS));
const D1 = dayAhead(20);
const D2 = dayAhead(21);
const D3 = dayAhead(22);

async function api(method: string, path: string, as?: As, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (as) {
    headers.authorization = `Bearer ${signToken(
      { id: as[0].toHexString(), name: 't', role: as[1] },
      'test-access-secret',
      3600
    )}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const user = (_id: ObjectId, name: string, phone: string, flags: Record<string, unknown> = {}) => ({
  _id,
  username: name,
  phoneNumber: phone,
  photoUrl: '',
  password: 'x',
  isAdmin: false,
  isGroomer: false,
  isVip: false,
  createdAt: new Date(),
  ...flags,
});

const order = (groomerId: ObjectId, date: string, time: string, extra: Record<string, unknown> = {}) => ({
  _id: new ObjectId(),
  clientId: ids.client,
  petId: ids.pet,
  groomerId,
  createdAt: new Date(),
  scheduledAt: zonedToUtc(date, time),
  durationMinutes: 60,
  status: 'pending',
  statusHistory: [],
  comment: '',
  serviceIds: [],
  ...extra,
});

async function seed() {
  await db.dropDatabase();
  await db.collection('user').insertMany([
    user(ids.admin, 'Адмін', '+380000000001', { isAdmin: true }),
    user(ids.groomerA, 'Грумер А', '+380000000002', { isGroomer: true }),
    user(ids.groomerB, 'Грумер Б', '+380000000003', { isGroomer: true }),
    user(ids.clientUser, 'Клієнт', '+380000000004'),
  ]);
  await db.collection('client').insertOne({
    _id: ids.client,
    phone: '+380501112233',
    phoneRaw: '+380501112233',
    name: 'Олена',
    lastVisitAt: null,
    visitsCount: 0,
    totalSpent: 0,
    crmGroup: '',
    dateSource: 'сайт',
    isForeign: false,
    doNotContact: false,
    lastNotifiedAt: null,
    notifyHistory: [],
    importedAt: new Date(),
  });
  await db.collection('pet').insertOne({
    _id: ids.pet,
    name: 'Бусинка',
    weight: 4,
    photoUrl: '',
    userId: ids.client,
    createdAt: new Date(),
  });
}

const scheduleDoc = (groomerId: ObjectId) =>
  db.collection('groomer_schedule').findOne({ groomerId });
const changes = (groomerId: ObjectId) =>
  db.collection('groomer_schedule_change').find({ groomerId }).toArray();

before(async () => {
  await mongo.connect();
  db = mongo.db(DB_NAME);
  server = createApp(db).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.dropDatabase();
  await mongo.close();
});

beforeEach(seed);

describe('типи винятків і діапазон дат', () => {
  for (const type of ['vacation', 'sick', 'day_off'] as const) {
    it(`${type} на діапазон — день без робочих годин`, async () => {
      const res = await api('POST', '/staff/schedule/me/exceptions', asA, {
        type,
        dateFrom: D1,
        dateTo: D2,
        from: '10:00',
        to: '12:00',
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.exception.type, type);
      assert.equal(res.body.exception.from, undefined, 'години для неробочого дня не зберігаються');

      const day = await api('GET', `/staff/schedule?date=${D2}`, asAdmin);
      const a = day.body.groomers.find((g: { groomerId: string }) => g.groomerId === ids.groomerA.toHexString());
      assert.deepEqual(a.intervals, []);
      assert.equal(a.exceptionType, type);

      const after = await api('GET', `/staff/schedule?date=${D3}`, asAdmin);
      const a3 = after.body.groomers.find((g: { groomerId: string }) => g.groomerId === ids.groomerA.toHexString());
      assert.equal(a3.source, 'default', 'наступний день після діапазону — знову звичайний');
    });
  }

  it('custom_hours — свої години в кожен день діапазону', async () => {
    const res = await api('POST', '/staff/schedule/me/exceptions', asA, {
      type: 'custom_hours',
      dateFrom: D1,
      dateTo: D2,
      from: '12:00',
      to: '16:00',
    });
    assert.equal(res.status, 201);
    const day = await api('GET', `/staff/schedule?date=${D2}`, asA);
    const a = day.body.groomers.find((g: { groomerId: string }) => g.groomerId === ids.groomerA.toHexString());
    assert.deepEqual(a.intervals, [{ from: '12:00', to: '16:00' }]);
  });

  for (const [name, body, code] of [
    ['невідомий тип', { type: 'holiday', dateFrom: D1 }, 'bad-type'],
    ['без дати', { type: 'vacation' }, 'bad-date'],
    ['кінець раніше за початок', { type: 'vacation', dateFrom: D2, dateTo: D1 }, 'bad-date-range'],
    ['custom_hours без годин', { type: 'custom_hours', dateFrom: D1 }, 'bad-time'],
    ['custom_hours із початком після кінця', { type: 'custom_hours', dateFrom: D1, from: '18:00', to: '10:00' }, 'bad-range'],
  ] as const) {
    it(`${name} — 400 ${code}`, async () => {
      const res = await api('POST', '/staff/schedule/me/exceptions', asA, body);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, code);
    });
  }

  it('перекриття з наявним винятком — 409', async () => {
    await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'vacation', dateFrom: D1, dateTo: D2 });
    const res = await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'sick', dateFrom: D2 });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'exception-overlap');
  });

  it('старий виняток {date, dayOff} читається як day_off', async () => {
    await db.collection('groomer_schedule').insertOne({
      groomerId: ids.groomerA,
      weekly: [],
      exceptions: [{ date: D1, dayOff: true }],
      updatedAt: new Date(),
    });
    const res = await api('GET', '/staff/schedule/me', asA);
    assert.equal(res.status, 200);
    assert.equal(res.body.exceptions[0].type, 'day_off');
    assert.equal(res.body.exceptions[0].dateFrom, D1);
  });
});

describe('права і журнал змін', () => {
  it('грумер змінює лише свій графік', async () => {
    const own = await api('POST', `/staff/schedule/${ids.groomerA}/exceptions`, asA, { type: 'day_off', dateFrom: D1 });
    assert.equal(own.status, 201);

    const foreign = await api('POST', `/staff/schedule/${ids.groomerB}/exceptions`, asA, { type: 'day_off', dateFrom: D1 });
    const weekly = await api('PUT', `/staff/schedule/${ids.groomerB}`, asA, { weekly: [] });
    assert.equal(foreign.status, 403);
    assert.equal(weekly.status, 403);
    assert.equal(await scheduleDoc(ids.groomerB), null);

    const id = own.body.exception.id;
    const removeForeign = await api('DELETE', `/staff/schedule/${ids.groomerA}/exceptions/${id}`, asB);
    assert.equal(removeForeign.status, 403);
  });

  it('адмін змінює будь-чий графік; changedBy і дата пишуться у виняток і журнал', async () => {
    const res = await api('POST', `/staff/schedule/${ids.groomerB}/exceptions`, asAdmin, {
      type: 'vacation',
      dateFrom: D1,
      dateTo: D3,
      note: 'Карпати',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.exception.changedBy, ids.admin.toHexString());
    assert.ok(res.body.exception.changedAt);

    const doc = await scheduleDoc(ids.groomerB);
    assert.ok(doc!.updatedBy.equals(ids.admin));

    const log = await changes(ids.groomerB);
    assert.equal(log.length, 1);
    assert.equal(log[0]!.action, 'exception-add');
    assert.equal(log[0]!.changedByRole, 'admin');
    assert.ok(log[0]!.changedBy.equals(ids.admin));
    assert.ok(log[0]!.changedAt instanceof Date);
  });

  it('кожна дія грумера — окремий рядок журналу', async () => {
    await api('PUT', '/staff/schedule/me', asA, { weekly: [{ weekday: 1, from: '10:00', to: '18:00' }] });
    const add = await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'sick', dateFrom: D1 });
    await api('DELETE', `/staff/schedule/me/exceptions/${add.body.exception.id}`, asA);

    const log = await changes(ids.groomerA);
    assert.deepEqual(log.map((c) => c.action), ['weekly', 'exception-add', 'exception-remove']);
    assert.ok(log.every((c) => c.changedBy.equals(ids.groomerA) && c.changedByRole === 'groomer'));
  });

  it('клієнт не змінює графік — 403', async () => {
    const res = await api('POST', `/staff/schedule/${ids.groomerA}/exceptions`, asClient, { type: 'day_off', dateFrom: D1 });
    assert.equal(res.status, 403);
  });
});

describe('зміна, що зачіпає вже існуючі записи', () => {
  beforeEach(async () => {
    await db.collection('order').insertMany([
      order(ids.groomerA, D1, '10:00'),
      order(ids.groomerA, D1, '15:00'),
      order(ids.groomerA, D1, '17:00', { status: 'cancelled' }),
      order(ids.groomerA, D3, '10:00'),
      order(ids.groomerB, D1, '10:00'),
    ]);
  });

  it('відпустку дозволено, у відповіді — кількість активних записів у ці дні', async () => {
    const res = await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'vacation', dateFrom: D1, dateTo: D2 });
    assert.equal(res.status, 201);
    assert.equal(res.body.affectedOrders, 2, 'скасований і записи інших днів/грумерів не рахуються');

    const log = await changes(ids.groomerA);
    assert.equal(log[0]!.affectedOrders, 2);
  });

  it('адмін бачить подію «перенести» на кожен такий запис', async () => {
    await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'vacation', dateFrom: D1, dateTo: D2 });
    const events = await api('GET', '/staff/admin/events', asAdmin);
    const reschedule = events.body.events.filter((e: { type: string }) => e.type === 'reschedule');
    assert.equal(reschedule.length, 2);
    assert.ok(reschedule.every((e: { exceptionType: string }) => e.exceptionType === 'vacation'));
  });

  it('custom_hours рахує лише записи, що не вміщаються в нові години', async () => {
    const res = await api('POST', '/staff/schedule/me/exceptions', asA, {
      type: 'custom_hours',
      dateFrom: D1,
      from: '12:00',
      to: '18:00',
    });
    assert.equal(res.body.affectedOrders, 1);
  });

  it('після видалення винятку події зникають', async () => {
    const add = await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'sick', dateFrom: D1 });
    const del = await api('DELETE', `/staff/schedule/me/exceptions/${add.body.exception.id}`, asA);
    assert.equal(del.status, 200);
    assert.equal(del.body.affectedOrders, 0);

    const events = await api('GET', '/staff/admin/events', asAdmin);
    assert.equal(events.body.events.filter((e: { type: string }) => e.type === 'reschedule').length, 0);
  });

  it('зміна тижневого шаблону теж повертає кількість зачеплених записів', async () => {
    // Робочі лише понеділки: D1 і D3 (якщо не понеділки) випадуть із графіка.
    const res = await api('PUT', '/staff/schedule/me', asA, { weekly: [{ weekday: 1, from: '09:00', to: '20:00' }] });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.affectedOrders, 'number');
    assert.ok(res.body.affectedOrders >= 0 && res.body.affectedOrders <= 3);
  });
});

describe('прапорець onlineBooking', () => {
  it('за замовчуванням увімкнено', async () => {
    const res = await api('GET', '/groomer');
    assert.ok(res.body.every((g: { onlineBooking: boolean }) => g.onlineBooking === true));
  });

  it('адмін вимикає — сайт бачить false, онлайн-запис до грумера відхиляється', async () => {
    const set = await api('PUT', `/staff/schedule/${ids.groomerA}/online-booking`, asAdmin, { onlineBooking: false });
    assert.equal(set.status, 200);

    const list = await api('GET', '/groomer');
    const a = list.body.find((g: { id: string }) => g.id === ids.groomerA.toHexString());
    assert.equal(a.onlineBooking, false);

    const booking = await api('POST', '/order', undefined, {
      clientName: 'Ірина',
      clientPhone: '+380671234567',
      petName: 'Рекс',
      groomerId: ids.groomerA.toHexString(),
      scheduledAt: zonedToUtc(D1, '11:00').toISOString(),
      durationMinutes: 60,
    });
    assert.equal(booking.status, 400);
    assert.equal(await db.collection('order').countDocuments({ groomerId: ids.groomerA }), 0);

    const log = await changes(ids.groomerA);
    assert.equal(log.at(-1)!.action, 'online-booking');
  });

  it('грумер не може змінити прапорець, навіть свій', async () => {
    const res = await api('PUT', '/staff/schedule/me/online-booking', asA, { onlineBooking: false });
    assert.equal(res.status, 403);
  });

  it('не boolean — 400', async () => {
    const res = await api('PUT', `/staff/schedule/${ids.groomerA}/online-booking`, asAdmin, { onlineBooking: 'no' });
    assert.equal(res.status, 400);
  });
});

describe('новий типовий тиждень діє з наступного понеділка', () => {
  const nextMondayFrom = (today: string) => {
    const d = new Date(`${today}T00:00:00.000Z`);
    const ahead = (8 - d.getUTCDay()) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + ahead);
    return d.toISOString().slice(0, 10);
  };
  const addDays = (date: string, n: number) => {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const intervalsOf = async (date: string) => {
    const day = await api('GET', `/staff/schedule?date=${date}`, asAdmin);
    return day.body.groomers.find((g: { groomerId: string }) => g.groomerId === ids.groomerA.toHexString())
      .intervals;
  };

  it('цей тиждень лишається як був, з понеділка — новий шаблон', async () => {
    const monday = nextMondayFrom(dateInZone(new Date()));
    const sunday = addDays(monday, -1);
    const tuesday = addDays(monday, 1);

    // Записи: у неділю перед зміною і у вівторок після.
    await db.collection('order').insertMany([
      order(ids.groomerA, sunday, '10:00'),
      order(ids.groomerA, tuesday, '10:00'),
    ]);

    // Новий шаблон: працює лише по понеділках.
    const res = await api('PUT', '/staff/schedule/me', asA, {
      weekly: [{ weekday: 1, from: '10:00', to: '18:00' }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.effectiveFrom, monday);
    assert.equal(res.body.affectedOrders, 1, 'рахується лише запис після понеділка');

    assert.deepEqual(await intervalsOf(sunday), [{ from: '09:00', to: '20:00' }], 'до понеділка — старий графік');
    assert.deepEqual(await intervalsOf(monday), [{ from: '10:00', to: '18:00' }]);
    assert.deepEqual(await intervalsOf(tuesday), []);

    const view = await api('GET', '/staff/schedule/me', asA);
    assert.deepEqual(view.body.weekly, []);
    assert.equal(view.body.pendingWeekly.effectiveFrom, monday);

    const log = await changes(ids.groomerA);
    assert.equal(log.at(-1)!.details.effectiveFrom, monday);
  });

  it('шаблон, чия дата настала, повертається як чинний', async () => {
    await db.collection('groomer_schedule').insertOne({
      groomerId: ids.groomerA,
      weekly: [],
      pendingWeekly: { effectiveFrom: '2020-01-06', weekly: [{ weekday: 1, from: '11:00', to: '15:00' }] },
      exceptions: [],
      updatedAt: new Date(),
    });
    const view = await api('GET', '/staff/schedule/me', asA);
    assert.equal(view.body.pendingWeekly, null);
    assert.deepEqual(view.body.weekly, [{ weekday: 1, from: '11:00', to: '15:00' }]);
  });

  it('перерва: два інтервали одного дня зберігаються як є', async () => {
    const weekly = [
      { weekday: 3, from: '09:00', to: '13:00' },
      { weekday: 3, from: '14:00', to: '18:00' },
    ];
    const res = await api('PUT', `/staff/schedule/${ids.groomerA}`, asAdmin, { weekly });
    assert.equal(res.status, 200);
    const view = await api('GET', `/staff/schedule/${ids.groomerA}`, asAdmin);
    assert.deepEqual(view.body.pendingWeekly.weekly, weekly);
  });
});

describe('список винятків для адміна', () => {
  it('містить, хто змінив, і скільки майбутніх записів зачіпає', async () => {
    await db.collection('order').insertOne(order(ids.groomerA, D1, '10:00'));
    await api('POST', `/staff/schedule/${ids.groomerA}/exceptions`, asAdmin, { type: 'vacation', dateFrom: D1 });
    await api('POST', '/staff/schedule/me/exceptions', asA, { type: 'day_off', dateFrom: D3 });

    const view = await api('GET', `/staff/schedule/${ids.groomerA}`, asAdmin);
    const [vacation, dayOff] = view.body.exceptions;
    assert.equal(vacation.changedByName, 'Адмін');
    assert.equal(vacation.affectedOrders, 1);
    assert.equal(dayOff.changedByName, 'Грумер А');
    assert.equal(dayOff.affectedOrders, 0);
  });
});
