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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFineRules, setShowFineRules] = useState(false);

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

const filteredPlayers = sortedPlayers.filter((player) =>
  player.name
    .toLocaleLowerCase("fi")
    .includes(searchQuery.toLocaleLowerCase("fi"))
);

const visiblePlayers = searchQuery.trim()
  ? filteredPlayers.slice(0, 5)
  : showAll
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
  className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
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
            OKK Tankki sakkokassa
          </h1>
        </header>
        <div className="-mt-5 mb-6 text-center">
  <button
    type="button"
    onClick={() => setShowFineRules(true)}
    className="cursor-pointer text-xs text-gray-500 transition hover:text-[#00843D]"
  >
    Mistä saan sakot?
  </button>
</div>

        <section className="mb-7 space-y-2">

  {/* 3 lavaa Sandelsia */}
  <div className="rounded-xl border border-[#1C2A21] bg-[#101712] px-4 py-3 shadow-lg">
    <div className="mb-1.5 flex items-center justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          3 lavaa Sandelsia
        </p>

        <p className="mt-0.5 text-xl font-bold">
          {Math.min(totalFines, 95)} €
          <span className="ml-1 text-xs font-normal text-[#F5A400]">
            / 95 €
          </span>
        </p>
      </div>

      {totalFines >= 95 && (
        <span className="text-xs font-semibold text-[#16A34A]">
          Tavoite saavutettu!
        </span>
      )}
    </div>

    <div className="h-1.5 overflow-hidden rounded-full bg-black">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          totalFines < 9.5
            ? "bg-red-500"
            : totalFines < 66.5
              ? "bg-[#F5A400]"
              : "bg-[#00843D]"
        }`}
        style={{
          width: `${Math.min((totalFines / 95) * 100, 100)}%`,
        }}
      />
    </div>
  </div>

  {/* Pasilan sauna */}
  <div className="rounded-xl border border-[#1C2A21] bg-[#101712] px-4 py-3 shadow-lg">
    <div className="mb-1.5 flex items-center justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          Pasilan Allianssi-sauna
        </p>

        <p className="mt-0.5 text-xl font-bold">
          {Math.min(totalFines, 355)} €
          <span className="ml-1 text-xs font-normal text-[#F5A400]">
            / 355 €
          </span>
        </p>
      </div>

      {totalFines >= 355 && (
        <span className="text-xs font-semibold text-[#16A34A]">
          Tavoite saavutettu!
        </span>
      )}
    </div>

    <div className="h-1.5 overflow-hidden rounded-full bg-black">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          totalFines < 35.5
            ? "bg-red-500"
            : totalFines < 248.5
              ? "bg-[#F5A400]"
              : "bg-[#00843D]"
        }`}
        style={{
          width: `${Math.min((totalFines / 355) * 100, 100)}%`,
        }}
      />
    </div>
  </div>

</section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Pelaajat
            </h2>

            <div className="relative w-40 sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hae pelaajaa..."
                className="w-full rounded-lg border border-[#1C2A21] bg-[#101712] px-3 py-2 pr-8 text-xs text-white outline-none transition placeholder:text-gray-600 focus:border-[#00843D]"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-white"
                  aria-label="Tyhjennä haku"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[360px]">
            {visiblePlayers.length === 0 ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-[#1C2A21] bg-[#101712]">
                <p className="text-sm text-gray-500">
                  Ei pelaajaa haulla "{searchQuery}"
                </p>
              </div>
            ) : (
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
                        <div className="border-t border-[#1C2A21] bg-black/30 px-4 py-2">
                          {playerFines.length === 0 ? (
                            <p className="py-1 text-xs text-gray-500">
                              Ei sakkoja.
                            </p>
                          ) : (
                            <div className="divide-y divide-[#1C2A21]">
                              {playerFines.map((fine, fineIndex) => (
                                <div
                                  key={fineIndex}
                                  className="flex justify-between py-2 text-xs"
                                >
                                  <div>
                                    <p className="text-gray-300">
                                      {fine.reason}
                                    </p>

                                    {fine.createdAt && (
                                      <p className="mt-0.5 text-[10px] text-gray-500">
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
            )}
          </div>

          {players.length > 5 && !searchQuery.trim() && (
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
      {showFineRules && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
    onClick={() => setShowFineRules(false)}
  >
    <div
      className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1C2A21] bg-[#101712] p-5 shadow-2xl sm:p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setShowFineRules(false)}
        className="absolute right-4 top-3 cursor-pointer text-xl text-gray-500 transition hover:text-white"
        aria-label="Sulje"
      >
        ×
      </button>

      <h2 className="mb-5 pr-8 text-2xl font-bold">
        Mistä saan sakot?
      </h2>

      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-white">
            Myöhästyminen joukkueen tapahtumasta ilman ilmoitusta
          </p>
          <div className="mt-1 space-y-0.5 text-gray-400">
            <p>
              Treenit <span className="float-right font-semibold text-[#F5A400]">5 €</span>
            </p>
            <p>
              Peli <span className="float-right font-semibold text-[#F5A400]">10 €</span>
            </p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">
            Puuttuva Jopox-ilmoittautuminen
          </p>
          <div className="mt-1 space-y-0.5 text-gray-400">
            <p>
              Treenit, alle 6 h ennen tapahtumaa
              <span className="float-right font-semibold text-[#F5A400]">5 €</span>
            </p>
            <p>
              Peli, alle 24 h ennen tapahtumaa
              <span className="float-right font-semibold text-[#F5A400]">5 €</span>
            </p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">
            Omien tavaroiden unohtaminen pukukoppiin
          </p>
          <div className="mt-1 space-y-0.5 text-gray-400">
            <p>
              Treenit <span className="float-right font-semibold text-[#F5A400]">5 €</span>
            </p>
            <p>
              Peli <span className="float-right font-semibold text-[#F5A400]">10 €</span>
            </p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">
            Varusteiden unohtaminen
          </p>
          <div className="mt-1 space-y-0.5 text-gray-400">
            <p>
              Treenit <span className="float-right font-semibold text-[#F5A400]">5 €</span>
            </p>
            <p>
              Peli <span className="float-right font-semibold text-[#F5A400]">10 €</span>
            </p>
          </div>
        </div>

        <div className="flex justify-between border-t border-[#1C2A21] pt-3">
          <p className="font-semibold text-white">
            Käytösrangaistus
          </p>
          <span className="font-semibold text-[#F5A400]">
            15 €
          </span>
        </div>

        <div className="flex justify-between">
          <p className="font-semibold text-white">
            Ei sakkoja koko kauden aikana
          </p>
          <span className="font-semibold text-[#F5A400]">
            10 €
          </span>
        </div>
      </div>
    </div>
  </div>
)}
    </main>
  );
}