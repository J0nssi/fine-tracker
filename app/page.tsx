"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Player = {
  id: string;
  name: string;
};

type Fine = {
  playerId: string;
  reason: string;
  amount: number;
  createdAt?: Timestamp;
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribePlayers = onSnapshot(
      collection(db, "players"),
      (snapshot) => {
        const playerData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fi"));

        setPlayers(playerData);
      }
    );

    const unsubscribeFines = onSnapshot(
      collection(db, "fines"),
      (snapshot) => {
        const fineData = snapshot.docs.map((doc) => ({
          playerId: doc.data().playerId,
          reason: doc.data().reason,
          amount: doc.data().amount,
          createdAt: doc.data().createdAt,
        }));

        setFines(fineData);
      }
    );

    return () => {
      unsubscribePlayers();
      unsubscribeFines();
    };
  }, []);

  const getPlayerFines = (playerId: string) => {
    return fines.filter((fine) => fine.playerId === playerId);
  };

  const getPlayerTotal = (playerId: string) => {
    return getPlayerFines(playerId).reduce(
      (total, fine) => total + fine.amount,
      0
    );
  };

  const totalFines = fines.reduce(
    (total, fine) => total + fine.amount,
    0
  );

  const sortedPlayers = [...players].sort(
    (a, b) => getPlayerTotal(b.id) - getPlayerTotal(a.id)
  );

  const visiblePlayers = showAll
    ? sortedPlayers
    : sortedPlayers.slice(0, 5);

  const togglePlayer = (playerId: string) => {
    setExpandedPlayer(
      expandedPlayer === playerId ? null : playerId
    );
  };

  return (
<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080B09] px-4 py-8 text-white sm:px-6">  <div className="mx-auto max-w-2xl">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <img
            src="/logo-600.png"
            alt=""
            className="h-[750px] w-[750px] max-w-none object-contain opacity-[0.08]"
          />
        </div>
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sakkokassa
          </h1>

          <p className="mt-2 text-sm font-medium uppercase tracking-widest text-gray-400">
            Pasilan sauna & 3 lavaa kaljaa
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
                Yhteensä
              </p>

              <p className="mt-1 text-4xl font-bold">
                {totalFines} €
              </p>
            </div>

            <p className="text-lg font-semibold text-[#F5A400]">
              / 400 €
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-black">
            <div
              className="h-full rounded-full bg-[#00843D] transition-all duration-500"
              style={{
                width: `${Math.min((totalFines / 400) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>0 €</span>
            <span>400 €</span>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Pelaajat
            </h2>

            <span className="text-sm text-gray-500">
              {players.length} pelaajaa
            </span>
          </div>

          <div className="space-y-3">
            {visiblePlayers.map((player, index) => {
              const playerFines = getPlayerFines(player.id);
              const playerTotal = getPlayerTotal(player.id);
              const isExpanded = expandedPlayer === player.id;

              return (
                <div
                  key={player.id}
                  className="overflow-hidden rounded-2xl border border-[#1C2A21] bg-[#101712] transition-colors hover:border-[#00843D]"
                >
                  <button
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-bold text-gray-400">
                        {index + 1}
                      </span>

                      <div>
                        <p className="font-semibold">
                          {player.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {playerFines.length}{" "}
                          {playerFines.length === 1
                            ? "sakko"
                            : "sakkoa"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold ${
                          playerTotal > 0
                            ? "text-[#F5A400]"
                            : "text-gray-500"
                        }`}
                      >
                        {playerTotal} €
                      </span>

                      <span
                        className={`text-gray-500 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#1C2A21] bg-black/30 px-5 py-3">
                      {playerFines.length === 0 ? (
                        <p className="py-2 text-sm text-gray-500">
                          Ei sakkoja.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#1C2A21]">
                          {playerFines.map((fine, fineIndex) => (
                            <div
                              key={fineIndex}
                              className="flex justify-between py-3 text-sm"
                            >
                              <div>
                                <p className="text-gray-300">
                                  {fine.reason}
                                </p>

                                {fine.createdAt && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {fine.createdAt
                                      .toDate()
                                      .toLocaleDateString("fi-FI")}
                                  </p>
                                )}
                              </div>

                              <span className="font-semibold text-[#F5A400]">
                                {fine.amount} €
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {players.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="mt-5 w-full cursor-pointer rounded-xl border border-[#1C2A21] bg-[#101712] px-4 py-3 text-sm font-semibold text-gray-300 transition hover:border-[#00843D] hover:bg-[#132019] hover:text-white"
            >
              {showAll
                ? "Näytä vähemmän"
                : `Näytä kaikki (${players.length})`}
            </button>
          )}
        </section>

        <div className="mt-10 text-center">
          <a
            href="/admin"
            className="text-xs text-gray-600 transition hover:text-[#00843D]"
          >
            Ylläpito
          </a>
        </div>
      </div>
    </main>
  );
}