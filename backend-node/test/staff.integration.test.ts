// Інтеграційні тести кабінету персоналу: справжній Express-застосунок
// (createApp) поверх справжньої MongoDB.
//
// База — ЛИШЕ локальна: TEST_MONGO_URL (за замовчуванням
// mongodb://127.0.0.1:27017) і окрема база bastidot_test, яку тест
// чистить перед кожним кейсом. Atlas і робочі дані не чіпаються ніколи.
//
//   brew services start mongodb-community@7.0
//   npm test
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { MongoClient, ObjectId, type Db } from 'mongodb';

const MONGO_URL = process.env.TEST_MONGO_URL ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = 'bastidot_test';

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(MONGO_URL)) {
  throw new Error(`Тести ганяються лише на локальній MongoDB, отримано: ${MONGO_URL}`);
}

// config.ts читає оточення в момент імпорту, тому все задаємо до нього.
// Значення DB_* фіктивні: застосунок отримує вже підключений Db і сам
// у базу не ходить. Telegram/OTP/дайджест вимкнені явно.
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
  ORDER_SELF_SERVICE_CUTOFF_HOURS: '3',
});

const { createApp } = await import('../src/app.ts');
const { signToken } = await import('../src/shared/jwt.ts');
const { zonedToUtc, dateInZone } = await import('../src/features/schedule/time.ts');

type Role = 'client' | 'groomer' | 'admin';

const mongo = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
let db: Db;
let server: Server;
let baseUrl: string;

const ids = {
  admin: new ObjectId(),
  groomerA: new ObjectId(),
  groomerB: new ObjectId(),
  notGroomer: new ObjectId(),
  clientUser: new ObjectId(),
  clientA: new ObjectId(),
  clientB: new ObjectId(),
  petA: new ObjectId(),
  petB: new ObjectId(),
  breed: new ObjectId(),
  service: new ObjectId(),
  orderA: new ObjectId(),
  orderB: new ObjectId(),
};

const PHONE_A = '+380501112233';
const PHONE_B = '+380674445566';
const PRICE = 1777;

// День за місяць від сьогодні: далеко поза межею самообслуговування клієнта.
const DAY = dateInZone(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
const at = (time: string) => zonedToUtc(DAY, time);

function token(userId: ObjectId, role: Role): string {
  return signToken({ id: userId.toHexString(), name: 'test', role }, 'test-access-secret', 3600);
}

async function api(
  method: string,
  path: string,
  options: { as?: [ObjectId, Role]; body?: unknown } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.as) headers.authorization = `Bearer ${token(...options.as)}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const asAdmin = { as: [ids.admin, 'admin'] as [ObjectId, Role] };
const asGroomerA = { as: [ids.groomerA, 'groomer'] as [ObjectId, Role] };
const asGroomerB = { as: [ids.groomerB, 'groomer'] as [ObjectId, Role] };
const asClient = { as: [ids.clientUser, 'client'] as [ObjectId, Role] };

function user(_id: ObjectId, name: string, phone: string, flags: Partial<Record<string, unknown>> = {}) {
  return {
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
  };
}

function client(_id: ObjectId, name: string, phone: string) {
  return {
    _id,
    phone,
    phoneRaw: phone,
    name,
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
  };
}

function order(
  _id: ObjectId,
  groomerId: ObjectId,
  clientId: ObjectId,
  petId: ObjectId,
  scheduledAt: Date,
  extra: Record<string, unknown> = {}
) {
  return {
    _id,
    clientId,
    petId,
    groomerId,
    createdAt: new Date(),
    scheduledAt,
    durationMinutes: 60,
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: new Date() }],
    comment: 'Коментар клієнта',
    serviceIds: [ids.service],
    cancelToken: `token-${_id.toHexString()}`,
    ...extra,
  };
}

async function seed(): Promise<void> {
  await db.dropDatabase();

  await db.collection('user').insertMany([
    user(ids.admin, 'Адмін', '+380000000001', { isAdmin: true }),
    user(ids.groomerA, 'Грумер А', '+380000000002', { isGroomer: true }),
    user(ids.groomerB, 'Грумер Б', '+380000000003', { isGroomer: true }),
    user(ids.notGroomer, 'Колишній грумер', '+380000000004'),
    user(ids.clientUser, 'Клієнт А', PHONE_A, { clientId: ids.clientA }),
  ]);
  await db.collection('client').insertMany([
    client(ids.clientA, 'Олена', PHONE_A),
    client(ids.clientB, 'Тарас', PHONE_B),
  ]);
  await db.collection('breed').insertOne({ _id: ids.breed, name: 'Мальтіпу' });
  await db.collection('service').insertOne({
    _id: ids.service,
    breedId: ids.breed,
    type: 'Комплекс',
    defaultPrice: PRICE,
    vipPrice: null,
    durationHour: 1,
    durationMin: 0,
  });
  await db.collection('pet').insertMany([
    { _id: ids.petA, name: 'Бусинка', breedId: ids.breed, weight: 4, photoUrl: '', userId: ids.clientUser, createdAt: new Date() },
    { _id: ids.petB, name: 'Рекс', breedId: ids.breed, weight: 9, photoUrl: '', userId: new ObjectId(), createdAt: new Date() },
  ]);
  await db.collection('order').insertMany([
    order(ids.orderA, ids.groomerA, ids.clientA, ids.petA, at('10:00')),
    order(ids.orderB, ids.groomerB, ids.clientB, ids.petB, at('10:00')),
  ]);
}

const orderStatus = async (id: ObjectId) =>
  (await db.collection('order').findOne({ _id: id }))!.status as string;

/** Усі ключі обʼєкта на будь-якій глибині — щоб DTO не протягнув поле десь усередині. */
function deepKeys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => deepKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      deepKeys(v, out);
    }
  }
  return out;
}

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

describe('грумер бачить лише свої записи', () => {
  it('день грумера містить тільки його записи', async () => {
    const res = await api('GET', `/staff/groomer/orders?date=${DAY}`, asGroomerA);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.orders.map((o: { id: string }) => o.id),
      [ids.orderA.toHexString()]
    );
  });

  it('чужий запис за id — 404, як неіснуючий', async () => {
    const foreign = await api('GET', `/staff/groomer/orders/${ids.orderB}`, asGroomerA);
    const missing = await api('GET', `/staff/groomer/orders/${new ObjectId()}`, asGroomerA);
    assert.equal(foreign.status, 404);
    assert.deepEqual(foreign.body, missing.body);
  });

  it('чужий запис не можна змінити: ні статус, ні нотатку', async () => {
    const status = await api('PATCH', `/staff/groomer/orders/${ids.orderB}/status`, {
      ...asGroomerA,
      body: { status: 'came' },
    });
    const note = await api('PATCH', `/staff/groomer/orders/${ids.orderB}/note`, {
      ...asGroomerA,
      body: { groomerNote: 'чужа нотатка' },
    });
    assert.equal(status.status, 404);
    assert.equal(note.status, 404);

    const stored = await db.collection('order').findOne({ _id: ids.orderB });
    assert.equal(stored!.status, 'pending');
    assert.equal(stored!.groomerNote, undefined);
  });

  it('DTO грумера не містить телефонів і цін', async () => {
    const day = await api('GET', `/staff/groomer/orders?date=${DAY}`, asGroomerA);
    const one = await api('GET', `/staff/groomer/orders/${ids.orderA}`, asGroomerA);

    for (const res of [day, one]) {
      assert.equal(res.status, 200);
      const keys = deepKeys(res.body).map((k) => k.toLowerCase());
      for (const banned of ['phone', 'phoneraw', 'phonenumber', 'price', 'defaultprice', 'vipprice', 'total', 'email', 'client', 'canceltoken']) {
        assert.ok(!keys.includes(banned), `у DTO грумера є поле «${banned}»`);
      }
      const raw = JSON.stringify(res.body);
      assert.ok(!raw.includes(PHONE_A.slice(-9)), 'у DTO грумера є телефон клієнта');
      assert.ok(!raw.includes(String(PRICE)), 'у DTO грумера є ціна послуги');
    }

    // Те, що грумеру потрібно, на місці.
    const dto = one.body;
    assert.equal(dto.ownerName, 'Олена');
    assert.equal(dto.pet.name, 'Бусинка');
    assert.deepEqual(dto.services, ['Комплекс']);
  });

  it('користувач без прапорця isGroomer не відкриє день навіть з токеном грумера', async () => {
    const res = await api('GET', `/staff/groomer/orders?date=${DAY}`, {
      as: [ids.notGroomer, 'groomer'],
    });
    assert.equal(res.status, 403);
  });

  it('грумер не має доступу до адмінських ендпоінтів із телефонами й сумами', async () => {
    for (const [method, path, body] of [
      ['GET', `/staff/admin/orders?date=${DAY}`],
      ['GET', '/staff/admin/clients?q=Олена'],
      ['GET', `/staff/admin/stats?date=${DAY}`],
      ['GET', '/staff/admin/events'],
      ['PATCH', `/staff/admin/orders/${ids.orderB}/groomer`, { groomerId: ids.groomerA.toHexString() }],
      ['POST', `/staff/admin/orders/${ids.orderB}/cancel`],
    ] as const) {
      const res = await api(method, path, { ...asGroomerA, body });
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    assert.equal(await orderStatus(ids.orderB), 'pending');
  });
});

describe('клієнт не потрапляє в /staff', () => {
  const staffRoutes = [
    ['GET', '/staff/schedule'],
    ['GET', '/staff/schedule/' + new ObjectId().toHexString()],
    ['GET', '/staff/groomer/orders'],
    ['GET', `/staff/groomer/orders/${ids.orderA}`],
    ['PATCH', `/staff/groomer/orders/${ids.orderA}/status`, { status: 'came' }],
    ['PATCH', `/staff/groomer/orders/${ids.orderA}/note`, { groomerNote: 'x' }],
    ['GET', '/staff/admin/orders'],
    ['GET', '/staff/admin/clients?q=a'],
    ['POST', '/staff/admin/orders', {}],
    ['POST', `/staff/admin/orders/${ids.orderA}/confirm`],
    ['POST', `/staff/admin/orders/${ids.orderA}/cancel`],
    ['PATCH', `/staff/admin/orders/${ids.orderA}/groomer`, { groomerId: ids.groomerB.toHexString() }],
    ['PATCH', `/staff/admin/orders/${ids.orderA}/schedule`, { scheduledAt: new Date().toISOString() }],
  ] as const;

  it('клієнт отримує 403 на кожен маршрут /staff/*', async () => {
    for (const [method, path, body] of staffRoutes) {
      const res = await api(method, path, { ...asClient, body });
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    assert.equal(await orderStatus(ids.orderA), 'pending');
  });

  it('без токена — 401', async () => {
    for (const [method, path, body] of staffRoutes) {
      const res = await api(method, path, { body });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });

  it('токен без ролі (виданий до появи ролей) вважається клієнтським', async () => {
    const legacy = signToken({ id: ids.groomerA.toHexString() }, 'test-access-secret', 3600);
    const res = await fetch(`${baseUrl}/staff/groomer/orders`, {
      headers: { authorization: `Bearer ${legacy}` },
    });
    assert.equal(res.status, 403);
  });
});

describe('переходи статусів', () => {
  const setStatus = (status: string, body: Record<string, unknown> = {}) =>
    api('PATCH', `/staff/groomer/orders/${ids.orderA}/status`, {
      ...asGroomerA,
      body: { status, ...body },
    });

  it('pending → came → completed, з історією і нотаткою', async () => {
    const came = await setStatus('came', { groomerNote: '  Нервується на кігтях  ' });
    assert.equal(came.status, 200);
    assert.equal(came.body.status, 'came');
    assert.equal(came.body.groomerNote, 'Нервується на кігтях');

    const done = await setStatus('completed');
    assert.equal(done.status, 200);
    assert.equal(done.body.status, 'completed');
    // Нотатку, не передану вдруге, не затерто.
    assert.equal(done.body.groomerNote, 'Нервується на кігтях');

    const stored = await db.collection('order').findOne({ _id: ids.orderA });
    assert.deepEqual(
      stored!.statusHistory.map((h: { status: string }) => h.status),
      ['pending', 'came', 'completed']
    );
    assert.ok(stored!.statusHistory.slice(1).every((h: { changedBy: ObjectId }) => h.changedBy.equals(ids.groomerA)));
  });

  it('pending → no_show', async () => {
    const res = await setStatus('no_show');
    assert.equal(res.status, 200);
    assert.equal(await orderStatus(ids.orderA), 'no_show');
  });

  for (const [from, to] of [
    ['pending', 'completed'],
    ['came', 'came'],
    ['came', 'no_show'],
    ['completed', 'came'],
    ['completed', 'no_show'],
    ['no_show', 'came'],
    ['no_show', 'completed'],
    ['cancelled', 'came'],
    ['cancelled', 'completed'],
  ] as const) {
    it(`${from} → ${to} заборонено (409), статус не змінюється`, async () => {
      await db.collection('order').updateOne({ _id: ids.orderA }, { $set: { status: from } });
      const res = await setStatus(to);
      assert.equal(res.status, 409);
      assert.equal(await orderStatus(ids.orderA), from);
    });
  }

  for (const bad of ['cancelled', 'pending', 'done', '', undefined]) {
    it(`грумер не може виставити статус ${JSON.stringify(bad)} (400)`, async () => {
      const res = await setStatus(bad as string);
      assert.equal(res.status, 400);
      assert.equal(await orderStatus(ids.orderA), 'pending');
    });
  }
});

describe('перепризначення грумера адміністратором', () => {
  const reassign = (orderId: ObjectId, groomerId: ObjectId | string) =>
    api('PATCH', `/staff/admin/orders/${orderId}/groomer`, {
      ...asAdmin,
      body: { groomerId: String(groomerId) },
    });

  it('на зайнятий слот (той самий час) — 409 slot-taken, запис лишається за старим грумером', async () => {
    const res = await reassign(ids.orderA, ids.groomerB);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'slot-taken');
    const stored = await db.collection('order').findOne({ _id: ids.orderA });
    assert.ok(stored!.groomerId.equals(ids.groomerA));
  });

  it('часткове перекриття теж блокує', async () => {
    await db.collection('order').updateOne({ _id: ids.orderB }, { $set: { scheduledAt: at('10:30') } });
    const res = await reassign(ids.orderA, ids.groomerB);
    assert.equal(res.status, 409);
  });

  it('стик в стик (10:00–11:00 після 09:00–10:00) — дозволено', async () => {
    await db.collection('order').updateOne({ _id: ids.orderB }, { $set: { scheduledAt: at('09:00') } });
    const res = await reassign(ids.orderA, ids.groomerB);
    assert.equal(res.status, 200);
    assert.equal(res.body.groomer.id, ids.groomerB.toHexString());
  });

  it('скасований запис у новому грумері слот не займає', async () => {
    await db.collection('order').updateOne({ _id: ids.orderB }, { $set: { status: 'cancelled' } });
    const res = await reassign(ids.orderA, ids.groomerB);
    assert.equal(res.status, 200);
  });

  it('після перепризначення запис зникає в старого грумера і зʼявляється в нового', async () => {
    await db.collection('order').updateOne({ _id: ids.orderB }, { $set: { scheduledAt: at('13:00') } });
    assert.equal((await reassign(ids.orderA, ids.groomerB)).status, 200);

    const a = await api('GET', `/staff/groomer/orders?date=${DAY}`, asGroomerA);
    const b = await api('GET', `/staff/groomer/orders?date=${DAY}`, asGroomerB);
    assert.deepEqual(a.body.orders, []);
    assert.deepEqual(
      b.body.orders.map((o: { id: string }) => o.id).sort(),
      [ids.orderA.toHexString(), ids.orderB.toHexString()].sort()
    );
    assert.equal((await api('GET', `/staff/groomer/orders/${ids.orderA}`, asGroomerA)).status, 404);

    const stored = await db.collection('order').findOne({ _id: ids.orderA });
    assert.equal(stored!.statusHistory.at(-1).note, 'Змінено грумера');
  });

  it('на користувача без isGroomer — 404, на неіснуючого — 404', async () => {
    assert.equal((await reassign(ids.orderA, ids.notGroomer)).status, 404);
    assert.equal((await reassign(ids.orderA, new ObjectId())).status, 404);
    assert.equal((await reassign(ids.orderA, 'not-an-id')).status, 404);
  });

  it('скасований запис перепризначити не можна', async () => {
    await db.collection('order').updateOne({ _id: ids.orderA }, { $set: { status: 'cancelled' } });
    const res = await reassign(ids.orderA, ids.groomerB);
    assert.equal(res.status, 409);
  });
});

describe('кабінет клієнта після статусу «Прийшов»', () => {
  const markCame = () =>
    api('PATCH', `/staff/groomer/orders/${ids.orderA}/status`, { ...asGroomerA, body: { status: 'came' } });

  it('візит зі статусом came переходить з «найближчих» у «минулі», без кнопок змін', async () => {
    assert.equal((await markCame()).status, 200);

    const upcoming = await api('GET', '/protected/orders?scope=upcoming', asClient);
    const past = await api('GET', '/protected/orders?scope=past', asClient);
    assert.equal(upcoming.status, 200);
    assert.deepEqual(upcoming.body.items, []);

    const visit = past.body.items.find((v: { id: string }) => v.id === ids.orderA.toHexString());
    assert.ok(visit, 'візит came відсутній у минулих');
    assert.equal(visit.status, 'came');
    assert.equal(visit.canCancel, false);
    assert.equal(visit.canReschedule, false);
    assert.equal(visit.total, PRICE);
  });

  it('клієнт не бачить нотатку грумера у своєму кабінеті', async () => {
    await api('PATCH', `/staff/groomer/orders/${ids.orderA}/status`, {
      ...asGroomerA,
      body: { status: 'came', groomerNote: 'Кусається' },
    });
    const past = await api('GET', '/protected/orders?scope=past', asClient);
    assert.ok(!JSON.stringify(past.body).includes('Кусається'));
  });

  for (const status of ['came', 'completed', 'no_show'] as const) {
    it(`клієнт не може скасувати візит зі статусом ${status} (кабінет)`, async () => {
      await db.collection('order').updateOne({ _id: ids.orderA }, { $set: { status } });
      const res = await api('POST', `/order/${ids.orderA}/cancel`, { ...asClient, body: {} });
      assert.equal(res.status, 409);
      assert.equal(await orderStatus(ids.orderA), status);
    });

    it(`клієнт не може перенести візит зі статусом ${status} (cancelToken)`, async () => {
      await db.collection('order').updateOne({ _id: ids.orderA }, { $set: { status } });
      const res = await api('PATCH', `/order/${ids.orderA}/schedule`, {
        body: {
          token: `token-${ids.orderA.toHexString()}`,
          scheduledAt: at('15:00').toISOString(),
        },
      });
      assert.equal(res.status, 409);
      const stored = await db.collection('order').findOne({ _id: ids.orderA });
      assert.equal(stored!.status, status);
      assert.equal(stored!.scheduledAt.getTime(), at('10:00').getTime());
    });
  }

  it('звичайний pending-візит клієнт і далі може скасувати', async () => {
    const res = await api('POST', `/order/${ids.orderA}/cancel`, { ...asClient, body: {} });
    assert.equal(res.status, 200);
    assert.equal(await orderStatus(ids.orderA), 'cancelled');
  });
});
