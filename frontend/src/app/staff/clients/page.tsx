'use client';

import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { ErrorState, LoadingState } from '@/components/account-state';
import {
  SEGMENT_LABEL,
  fetchAdminClients,
  type AdminClientsPage,
  type ClientSegment,
} from '@/api/staff';

import AddClientSheet from './add-client-sheet';
import ClientPanel from './client-panel';
import { SEGMENT_ORDER, money, prettyPhone, shortDate } from './format';
import styles from './clients.module.scss';

/** Пауза після останньої літери, перш ніж шукати. */
const SEARCH_DEBOUNCE_MS = 300;

const ClientsPage = () => {
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState<ClientSegment | null>(null);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminClientsPage | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let stale = false;
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));

    void fetchAdminClients({ q, segment, page }).then((result) => {
      if (stale) return;
      if (!result.ok) {
        setMessage(result.message);
        setState('error');
        return;
      }
      // Старий бекенд на цьому шляху віддавав масив швидкого пошуку — без
      // counts сторінка впала б. Показуємо зрозумілу помилку замість білого екрана.
      if (!result.data || !Array.isArray(result.data.items) || !result.data.counts) {
        setMessage(
          'Сервер віддав несподівану відповідь. Схоже, бекенд не оновлений — перезапустіть його'
        );
        setState('error');
        return;
      }
      setData(result.data);
      setState('ready');
    });

    return () => {
      stale = true;
    };
  }, [q, segment, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  const pickSegment = (next: ClientSegment | null) => {
    setSegment(next);
    setPage(1);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tiles: { key: ClientSegment | null; label: string; count: number }[] = data
    ? [
        { key: null, label: 'Усі клієнти', count: data.counts.all },
        ...SEGMENT_ORDER.map((s) => ({ key: s, label: SEGMENT_LABEL[s], count: data.counts[s] })),
      ]
    : [];

  return (
    <section className={classNames(styles.root, selectedId && styles.rootWithPanel)}>
      <div className={styles.main}>
        <div className={styles.tiles} role="tablist" aria-label="Сегменти клієнтів">
          {tiles.map((tile) => (
            <button
              key={tile.key ?? 'all'}
              type="button"
              role="tab"
              aria-selected={segment === tile.key}
              className={classNames(
                styles.tile,
                tile.key && styles[`tile_${tile.key}`],
                segment === tile.key && styles.tileActive
              )}
              onClick={() => pickSegment(tile.key)}
            >
              <span className={styles.tileCount}>{tile.count}</span>
              <span className={styles.tileLabel}>{tile.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className={styles.srOnly}>Пошук клієнта</span>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Імʼя, телефон або кличка улюбленця"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            text="Мітки"
            disabled
            title="Скоро"
            className={styles.toolbarButton}
          />
          <Button
            type="button"
            text="+ Додати клієнта"
            className={styles.toolbarButton}
            onClick={() => setAddOpen(true)}
          />
        </div>

        {state === 'loading' && !data && <LoadingState label="Завантажуємо клієнтів" />}
        {state === 'error' && <ErrorState message={message} onRetry={reload} />}

        {data && state !== 'error' && (
          <>
            {data.items.length === 0 ? (
              <p className={styles.empty}>
                {q ? `За запитом «${q}» нікого не знайдено.` : 'У цьому сегменті поки нікого.'}
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Клієнт</th>
                      <th scope="col">Улюбленці</th>
                      <th scope="col" className={styles.num}>
                        Візитів
                      </th>
                      <th scope="col">Останній візит</th>
                      <th scope="col" className={styles.num}>
                        Витрачено
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((client) => (
                      <tr
                        key={client.id}
                        className={classNames(
                          styles.row,
                          client.id === selectedId && styles.rowSelected
                        )}
                        onClick={() => setSelectedId(client.id)}
                      >
                        <td>
                          {/* Кнопка всередині рядка — щоб картку відкривали й з клавіатури. */}
                          <button
                            type="button"
                            className={styles.clientCell}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(client.id);
                            }}
                          >
                            <span className={styles.clientName}>{client.name}</span>
                            <span className={styles.clientPhone}>{prettyPhone(client.phone)}</span>
                          </button>
                        </td>
                        <td data-label="Улюбленці">
                          <span className={styles.chips}>
                            {client.pets.map((pet) => (
                              <span key={pet.id} className={styles.petChip}>
                                {pet.name}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className={styles.num} data-label="Візитів">
                          {client.visitsCount}
                        </td>
                        <td data-label="Останній візит" className={styles.nowrap}>
                          {shortDate(client.lastVisitAt)}
                        </td>
                        <td className={styles.num} data-label="Витрачено">
                          {money(client.spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pages > 1 && (
              <nav className={styles.pagination} aria-label="Сторінки">
                <Button
                  type="button"
                  variant="secondary"
                  text="← Назад"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                />
                <span className={styles.pageInfo}>
                  {page} з {pages} · {data.total} клієнтів
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  text="Далі →"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                />
              </nav>
            )}
          </>
        )}
      </div>

      {/* Картка зʼявляється лише після вибору клієнта: доти таблиця на всю ширину. */}
      {selectedId && (
        <ClientPanel key={selectedId} clientId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {addOpen && (
        <AddClientSheet
          onClose={() => setAddOpen(false)}
          onOpen={(id) => {
            setAddOpen(false);
            setSelectedId(id);
            reload();
          }}
        />
      )}
    </section>
  );
};

export default ClientsPage;
