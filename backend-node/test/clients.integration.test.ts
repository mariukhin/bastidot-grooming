// Інтеграційні тести списку клієнтів для адміна: пошук, агрегати, сегменти,
// пагінація, права. Лише локальна MongoDB і окрема база.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { MongoClient, ObjectId, type Db } from 'mongodb';

const MONGO_URL = process.env.TEST_MONGO_URL ?? 'mongodb://127.0.0.1:27017';
const DB_NAME = 'bastidot_test_clients';

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
const { ensureIndexes } = await import('../src/shared/indexes.ts');
const { ensurePetTraits } = await import('../src/features/pet/traits.ts');

type Role = 'client' | 'groomer' | 'admin';

const mongo = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
let db: Db;
let server: Server;
let baseUrl: string;

const admin = new ObjectId();
const groomer = new ObjectId();
const vipGroomer = new ObjectId();
const service = new ObjectId();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function get(path: string, role: Role = 'admin', id: ObjectId = admin) {
  return await call('GET', path, undefined, role, id);
}

async function call(method: string, path: string, body?: unknown, role: Role = 'admin', id: ObjectId = admin) {
  const token = signToken({ id: id.toHexString(), name: 't', role }, 'test-access-secret', 3600);
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let seq = 0;
async function client(name: string, phone: string, visits: { at: Date; status?: string; vip?: boolean; total?: number }[], petName?: string) {
  const _id = new ObjectId();
  seq++;
  await db.collection('client').insertOne({
    _id,
    phone,
    phoneRaw: '0' + phone.slice(4),
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
  });
  const pet = new ObjectId();
  await db.collection('pet').insertOne({ _id: pet, name: petName ?? `Пес${seq}`, weight: 5, photoUrl: '', userId: _id, createdAt: new Date() });
  if (visits.length) {
    await db.collection('order').insertMany(
      visits.map((v) => ({
        clientId: _id,
        petId: pet,
        groomerId: v.vip ? vipGroomer : groomer,
        createdAt: v.at,
        scheduledAt: v.at,
        durationMinutes: 60,
        status: v.status ?? 'completed',
        statusHistory: [],
        comment: '',
        serviceIds: [service],
        ...(v.total !== undefined ? { total: v.total } : {}),
      }))
    );
  }
  return _id.toHexString();
}

const ids: Record<string, string> = {};

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

beforeEach(async () => {
  await db.dropDatabase();
  await db.collection('user').insertMany([
    { _id: admin, username: 'Адмін', phoneNumber: '+380000000001', photoUrl: '', password: 'x', isAdmin: true, isGroomer: false, isVip: false, createdAt: new Date() },
    { _id: groomer, username: 'Г', phoneNumber: '+380000000002', photoUrl: '', password: 'x', isAdmin: false, isGroomer: true, isVip: false, createdAt: new Date() },
    { _id: vipGroomer, username: 'VIP', phoneNumber: '+380000000003', photoUrl: '', password: 'x', isAdmin: false, isGroomer: true, isVip: true, createdAt: new Date() },
  ]);
  await ensurePetTraits(db);
  await db.collection('service').insertOne({ _id: service, breedId: new ObjectId(), type: 'Комплекс', defaultPrice: 1000, vipPrice: 1500, durationHour: 1, durationMin: 0 });

  // Постійна й давно не була: 4 візити раз на 3 тижні, останній 70 днів тому.
  ids.olena = await client('Олена Коваль', '+380501112233', [
    { at: daysAgo(133) }, { at: daysAgo(112) }, { at: daysAgo(91) }, { at: daysAgo(70) },
    { at: daysAgo(60), status: 'cancelled' },
  ], 'Бусинка');
  // Постійна, ходить регулярно: інтервал 14 днів, останній 10 днів тому — не «давно».
  ids.taras = await client('Тарас', '+380672223344', [
    { at: daysAgo(38) }, { at: daysAgo(24) }, { at: daysAgo(10), vip: true },
  ]);
  // Нова: перший візит 5 днів тому.
  ids.iryna = await client('Ірина', '+380933334455', [{ at: daysAgo(5), total: 777 }]);
  // Без візитів: є запис, але не завершений.
  ids.petro = await client('Петро', '+380504445566', [
    { at: daysAgo(-3), status: 'pending' },
    { at: daysAgo(20), status: 'no_show' },
  ]);
  // Давно не була за інтервалом: ходила щотижня, минуло 3 тижні (< 8 тижнів).
  ids.anna = await client('Анна', '+380675556677', [
    { at: daysAgo(35) }, { at: daysAgo(28) }, { at: daysAgo(21) },
  ]);
  // Без записів зовсім — у жоден сегмент не потрапляє.
  ids.ghost = await client('Імпорт зі старої CRM', '+380506667788', []);
});

describe('GET /staff/admin/clients', () => {
  it('лише для адміна', async () => {
    assert.equal((await get('/staff/admin/clients', 'groomer', groomer)).status, 403);
    assert.equal((await get('/staff/admin/clients', 'client', new ObjectId())).status, 403);
  });

  it('агрегати: візити, витрачено лише completed, перший/останній, середній інтервал', async () => {
    const { body } = await get('/staff/admin/clients');
    const olena = body.items.find((c: { id: string }) => c.id === ids.olena);
    assert.equal(olena.visitsCount, 4, 'скасований не рахується');
    assert.equal(olena.spent, 4000);
    assert.equal(olena.avgIntervalDays, 21);
    assert.equal(new Date(olena.lastVisitAt).getTime() < daysAgo(69).getTime(), true);
    assert.deepEqual(olena.pets.map((p: { name: string }) => p.name), ['Бусинка']);

    const taras = body.items.find((c: { id: string }) => c.id === ids.taras);
    assert.equal(taras.spent, 1000 + 1000 + 1500, 'у VIP-грумера — VIP-ціна');

    const iryna = body.items.find((c: { id: string }) => c.id === ids.iryna);
    assert.equal(iryna.spent, 777, 'зафіксована ціна важливіша за поточний прайс');
    assert.equal(iryna.avgIntervalDays, null);

    const petro = body.items.find((c: { id: string }) => c.id === ids.petro);
    assert.equal(petro.visitsCount, 0);
    assert.equal(petro.spent, 0);
    assert.equal(petro.hasOrders, true);
  });

  it('сегменти й лічильники для плиток', async () => {
    const { body } = await get('/staff/admin/clients');
    const seg = (id: string) => body.items.find((c: { id: string }) => c.id === id).segments;

    assert.deepEqual(seg(ids.olena), ['regular', 'lapsed']);
    assert.deepEqual(seg(ids.taras), ['regular']);
    assert.deepEqual(seg(ids.iryna), ['new']);
    assert.deepEqual(seg(ids.petro), ['no_visits']);
    assert.deepEqual(seg(ids.anna), ['regular', 'lapsed'], '3 тижні > 2 × тижневий інтервал');
    assert.deepEqual(seg(ids.ghost), []);

    assert.deepEqual(body.counts, { all: 6, regular: 3, new: 1, lapsed: 2, no_visits: 1 });
  });

  it('фільтр за сегментом; лічильники лишаються загальними', async () => {
    const { body } = await get('/staff/admin/clients?segment=lapsed');
    assert.deepEqual(body.items.map((c: { id: string }) => c.id).sort(), [ids.olena, ids.anna].sort());
    assert.equal(body.total, 2);
    assert.equal(body.counts.all, 6);
  });

  for (const [name, q, expected] of [
    ['імʼя, частково', 'оле', 'olena'],
    ['телефон у форматі 067…', '0672223344', 'taras'],
    ['телефон у форматі +380…', '+38 (093) 333-44-55', 'iryna'],
    ['частина номера', '334455', 'iryna'],
    ['кличка улюбленця', 'буси', 'olena'],
  ] as const) {
    it(`пошук: ${name}`, async () => {
      const { body } = await get(`/staff/admin/clients?q=${encodeURIComponent(q)}`);
      assert.deepEqual(body.items.map((c: { id: string }) => c.id), [ids[expected]]);
      assert.equal(body.counts.all, 1, 'лічильники рахуються в межах пошуку');
    });
  }

  it('сортування: нещодавні зверху, без візитів — у кінці', async () => {
    const { body } = await get('/staff/admin/clients');
    const order = body.items.map((c: { id: string }) => c.id);
    assert.equal(order[0], ids.iryna);
    assert.deepEqual(order.slice(-2).sort(), [ids.petro, ids.ghost].sort());
  });

  it('пагінація по 20', async () => {
    for (let i = 0; i < 25; i++) await client(`Клієнт ${String(i).padStart(2, '0')}`, `+38050${String(1000000 + i)}`, []);
    const p1 = await get('/staff/admin/clients?page=1');
    const p2 = await get('/staff/admin/clients?page=2');
    assert.equal(p1.body.items.length, 20);
    assert.equal(p2.body.items.length, 11);
    assert.equal(p1.body.total, 31);
    const overlap = p1.body.items.filter((a: { id: string }) => p2.body.items.some((b: { id: string }) => b.id === a.id));
    assert.equal(overlap.length, 0);
  });

  it('невалідні параметри — 400', async () => {
    assert.equal((await get('/staff/admin/clients?segment=vip')).status, 400);
    assert.equal((await get('/staff/admin/clients?page=0')).status, 400);
    assert.equal((await get('/staff/admin/clients?page=abc')).status, 400);
  });

  it('швидкий пошук для форми запису переїхав на /search і працює як раніше', async () => {
    const { status, body } = await get('/staff/admin/clients/search?q=Тарас');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.equal(body[0].id, ids.taras);
  });
});

describe('ціна фіксується при завершенні візиту', () => {
  it('completed пише total за прайсом у момент завершення', async () => {
    const order = await db.collection('order').findOne({ clientId: new ObjectId(ids.petro), status: 'pending' });
    await db.collection('order').updateOne({ _id: order!._id }, { $set: { status: 'came' } });

    const token = signToken({ id: groomer.toHexString(), name: 't', role: 'groomer' }, 'test-access-secret', 3600);
    const res = await fetch(`${baseUrl}/staff/groomer/orders/${order!._id}/status`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await db.collection('order').findOne({ _id: order!._id }))!.total, 1000);

    // Прайс подорожчав — витрачене не змінилось.
    await db.collection('service').updateOne({ _id: service }, { $set: { defaultPrice: 2000 } });
    const { body } = await get(`/staff/admin/clients?q=Петро`);
    assert.equal(body.items[0].spent, 1000);
  });
});

describe('індекси', () => {
  it('створюються для пошуку за імʼям, телефоном і кличкою', async () => {
    await ensureIndexes(db);
    const client = (await db.collection('client').indexes()).map((i) => Object.keys(i.key).join(','));
    const pet = (await db.collection('pet').indexes()).map((i) => Object.keys(i.key).join(','));
    assert.ok(client.includes('name'));
    assert.ok(client.includes('phone'));
    assert.ok(pet.includes('name'));
  });
});


describe('GET /staff/admin/clients/:id — картка клієнта', () => {
  it('контакти, сегменти, агрегати, останні візити з грумером і сумою', async () => {
    const { status, body } = await get(`/staff/admin/clients/${ids.olena}`);
    assert.equal(status, 200);
    assert.equal(body.name, 'Олена Коваль');
    assert.equal(body.phone, '+380501112233');
    assert.deepEqual(body.segments, ['regular', 'lapsed']);
    assert.equal(body.stats.visitsCount, 4);
    assert.equal(body.stats.spent, 4000);
    assert.equal(body.stats.avgIntervalDays, 21);

    assert.equal(body.visits.length, 5, 'скасований теж в історії');
    const [first] = body.visits;
    assert.equal(first.status, 'cancelled', 'найсвіжіший зверху');
    assert.equal(first.groomer.name, 'Г');
    assert.deepEqual(first.services, ['Комплекс']);
    assert.equal(first.total, 1000);
    assert.equal(body.pets[0].name, 'Бусинка');
  });

  it('«Пора записати»: звичний інтервал минув — текст і дата', async () => {
    const { body } = await get(`/staff/admin/clients/${ids.olena}`);
    assert.match(body.rebookHint.text, /Пора записати/);
    assert.match(body.rebookHint.text, /21/);
    const due = new Date(body.rebookHint.dueAt).getTime();
    assert.ok(Math.abs(due - daysAgo(49).getTime()) < 2 * DAY, 'останній візит + 21 день');
  });

  it('підказки немає, якщо інтервал не минув, візит лише один або вже є запис наперед', async () => {
    assert.equal((await get(`/staff/admin/clients/${ids.taras}`)).body.rebookHint, null);
    assert.equal((await get(`/staff/admin/clients/${ids.iryna}`)).body.rebookHint, null);

    const pet = await db.collection('pet').findOne({ userId: new ObjectId(ids.olena) });
    await db.collection('order').insertOne({
      clientId: new ObjectId(ids.olena), petId: pet!._id, groomerId: groomer, createdAt: new Date(),
      scheduledAt: daysAgo(-5), durationMinutes: 60, status: 'pending', statusHistory: [], comment: '', serviceIds: [],
    });
    const { body } = await get(`/staff/admin/clients/${ids.olena}`);
    assert.equal(body.rebookHint, null);
    assert.equal(body.stats.hasUpcoming, true);
  });

  it('шкали характеру улюбленця — з підписами', async () => {
    const pet = await db.collection('pet').findOne({ userId: new ObjectId(ids.olena) });
    await db.collection('pet').updateOne({ _id: pet!._id }, { $set: { traits: [{ traitKey: 'fear_dryer', value: 8 }] } });
    const { body } = await get(`/staff/admin/clients/${ids.olena}`);
    assert.deepEqual(body.pets[0].traits, [
      { key: 'fear_dryer', label: 'Боїться фену', minLabel: 'Спокійний', maxLabel: 'Панікує', value: 8 },
    ]);
  });

  it('404 на невідомий id; 403 для грумера', async () => {
    assert.equal((await get(`/staff/admin/clients/${new ObjectId()}`)).status, 404);
    assert.equal((await get('/staff/admin/clients/not-an-id')).status, 404);
    assert.equal((await get(`/staff/admin/clients/${ids.olena}`, 'groomer', groomer)).status, 403);
  });
});

describe('adminNote — лише для персоналу', () => {
  it('адмін бачить і змінює нотатку', async () => {
    const res = await call('PATCH', `/staff/admin/clients/${ids.olena}`, { adminNote: 'Кусається на кігтях' });
    assert.equal(res.status, 200);
    assert.equal(res.body.adminNote, 'Кусається на кігтях');
    assert.equal((await call('PATCH', `/staff/admin/clients/${ids.olena}`, { adminNote: '' })).body.adminNote, '');
    assert.equal((await db.collection('client').findOne({ _id: new ObjectId(ids.olena) }))!.adminNote, undefined);
  });

  it('у кабінет клієнта нотатка не потрапляє ні в профіль, ні у візити, ні в улюбленців', async () => {
    const NOTE = 'СЕКРЕТНА-НОТАТКА-ПЕРСОНАЛУ';
    await db.collection('client').updateOne({ _id: new ObjectId(ids.olena) }, { $set: { adminNote: NOTE } });
    const userId = new ObjectId();
    await db.collection('user').insertOne({
      _id: userId, username: 'Олена', phoneNumber: '+380501112233', phoneVerifiedAt: new Date(), photoUrl: '',
      password: 'x', isAdmin: false, isGroomer: false, isVip: false, createdAt: new Date(), clientId: new ObjectId(ids.olena),
    });

    for (const path of ['/protected/profile', '/protected/orders?scope=past', '/protected/orders?scope=upcoming', '/protected/pets']) {
      const res = await call('GET', path, undefined, 'client', userId);
      assert.equal(res.status, 200, path);
      assert.ok(!JSON.stringify(res.body).includes(NOTE), `нотатка витекла в ${path}`);
    }

    // Грумер теж її не бачить — у DTO грумера немає клієнтської картки.
    const order = await db.collection('order').findOne({ clientId: new ObjectId(ids.olena) });
    const res = await call('GET', `/staff/groomer/orders/${order!._id}`, undefined, 'groomer', groomer);
    assert.equal(res.status, 200);
    assert.ok(!JSON.stringify(res.body).includes(NOTE));
  });
});

describe('POST/PATCH /staff/admin/clients', () => {
  it('створює клієнта по телефону в будь-якому записі, номер нормалізується', async () => {
    const res = await call('POST', '/staff/admin/clients', { name: '  Марта ', phone: '067 123 45 67', adminNote: 'Прийшла з Instagram' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Марта');
    assert.equal(res.body.phone, '+380671234567');
    assert.equal(res.body.adminNote, 'Прийшла з Instagram');
    assert.equal(res.body.source, 'адмінка');
    assert.equal(res.body.stats.visitsCount, 0);
  });

  it('той самий номер в іншому записі — 409 з id наявного клієнта', async () => {
    const res = await call('POST', '/staff/admin/clients', { name: 'Дубль', phone: '+38 (050) 111-22-33' });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'client-exists');
    assert.equal(res.body.existingId, ids.olena);
  });

  for (const [name, body, field] of [
    ['без імені', { phone: '0671112233' }, 'name'],
    ['без телефону', { name: 'Іван' }, 'phone'],
    ['кривий телефон', { name: 'Іван', phone: '12' }, 'phone'],
    ['кривa пошта', { name: 'Іван', phone: '0671112233', email: 'ivan@' }, 'email'],
  ] as const) {
    it(`валідація: ${name} — 400 field=${field}`, async () => {
      const res = await call('POST', '/staff/admin/clients', body);
      assert.equal(res.status, 400);
      assert.equal(res.body.field, field);
    });
  }

  it('PATCH: зміна номера на чужий — 409; на вільний — ок', async () => {
    const taken = await call('PATCH', `/staff/admin/clients/${ids.taras}`, { phone: '0501112233' });
    assert.equal(taken.status, 409);
    const free = await call('PATCH', `/staff/admin/clients/${ids.taras}`, { phone: '0679998877', lastName: 'Шевчук' });
    assert.equal(free.status, 200);
    assert.equal(free.body.phone, '+380679998877');
    assert.equal(free.body.lastName, 'Шевчук');
  });

  it('лише для адміна', async () => {
    assert.equal((await call('POST', '/staff/admin/clients', { name: 'X', phone: '0671112233' }, 'groomer', groomer)).status, 403);
    assert.equal((await call('PATCH', `/staff/admin/clients/${ids.olena}`, { adminNote: 'x' }, 'groomer', groomer)).status, 403);
  });
});

describe('улюбленці клієнта з адмінки', () => {
  const valid = { name: 'Рижик', breedCustom: 'Метис', weight: 7.5, traits: [{ traitKey: 'fear_scissors', value: 3 }] };

  it('POST додає улюбленця з тією ж валідацією, що й у кабінеті', async () => {
    const res = await call('POST', `/staff/admin/clients/${ids.ghost}/pets`, valid);
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Рижик');
    assert.equal(res.body.weight, 7.5);

    const card = await get(`/staff/admin/clients/${ids.ghost}`);
    assert.ok(card.body.pets.some((p: { name: string }) => p.name === 'Рижик'));
  });

  for (const [name, body, field] of [
    ['без породи', { name: 'Рижик', weight: 5 }, 'breedId'],
    ['вага поза межами', { ...valid, weight: 0 }, 'weight'],
    ['крок ваги', { ...valid, weight: 5.55 }, 'weight'],
    ['невідома шкала', { ...valid, traits: [{ traitKey: 'nope', value: 3 }] }, 'traits'],
  ] as const) {
    it(`валідація: ${name} — 400 field=${field}`, async () => {
      const res = await call('POST', `/staff/admin/clients/${ids.ghost}/pets`, body);
      assert.equal(res.status, 400);
      assert.equal(res.body.field, field);
    });
  }

  it('PATCH змінює улюбленця лише в межах цієї картки', async () => {
    const pet = await db.collection('pet').findOne({ userId: new ObjectId(ids.olena) });
    const ok = await call('PATCH', `/staff/admin/clients/${ids.olena}/pets/${pet!._id}`, { weight: 6.2 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.weight, 6.2);

    const foreign = await call('PATCH', `/staff/admin/clients/${ids.taras}/pets/${pet!._id}`, { weight: 9 });
    assert.equal(foreign.status, 404);
  });

  it('невідомий клієнт — 404', async () => {
    assert.equal((await call('POST', `/staff/admin/clients/${new ObjectId()}/pets`, valid)).status, 404);
  });
});
