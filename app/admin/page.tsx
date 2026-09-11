"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [players, setPlayers] = useState<
    { id: string; name: string }[]
  >([]);

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [fineMessage, setFineMessage] = useState("");

  const [fines, setFines] = useState<
    {
      id: string;
      playerId: string;
      reason: string;
      amount: number;
      createdAt?: unknown;
    }[]
  >([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    const loadPlayers = async () => {
      const snapshot = await getDocs(
        collection(db, "players")
      );

      const playerData = snapshot.docs
        .map((playerDoc) => ({
          id: playerDoc.id,
          name: playerDoc.data().name,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, "fi")
        );

      setPlayers(playerData);
    };

    loadPlayers();

    const unsubscribeFines = onSnapshot(
      collection(db, "fines"),
      (snapshot) => {
        const fineData = snapshot.docs.map((fineDoc) => ({
          id: fineDoc.id,
          playerId: fineDoc.data().playerId,
          reason: fineDoc.data().reason,
          amount: fineDoc.data().amount,
          createdAt: fineDoc.data().createdAt,
        }));

        setFines(fineData);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeFines();
    };
  }, []);

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setEmail("");
      setPassword("");
    } catch {
      setError(
        "Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana."
      );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getPlayerName = (playerId: string) => {
    return (
      players.find(
        (player) => player.id === playerId
      )?.name ?? "Tuntematon"
    );
  };

  const handleAddFine = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setFineMessage("");

    if (!selectedPlayer) {
      setFineMessage("Valitse pelaaja.");
      return;
    }

    if (!reason.trim()) {
      setFineMessage("Anna sakolle syy.");
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setFineMessage("Anna kelvollinen summa.");
      return;
    }

    try {
      await addDoc(collection(db, "fines"), {
        playerId: selectedPlayer,
        reason: reason.trim(),
        amount: numericAmount,
        createdAt: serverTimestamp(),
      });

      setReason("");
      setAmount("");
      setFineMessage("Sakko lisätty!");
    } catch {
      setFineMessage(
        "Sakon lisääminen epäonnistui."
      );
    }
  };

  const handleDeleteFine = async (
    fineId: string
  ) => {
    const confirmed = window.confirm(
      "Haluatko varmasti poistaa tämän sakon?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "fines", fineId)
      );
    } catch {
      setFineMessage(
        "Sakon poistaminen epäonnistui."
      );
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#080B09] px-4 py-8 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">
                Sakkokassa
              </h1>

              <p className="mt-2 text-sm font-medium uppercase tracking-widest text-gray-500">
                Ylläpito
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Sähköposti
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
                  placeholder="sähköposti"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Salasana
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
                  placeholder="salasana"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl bg-[#00843D] px-4 py-3 font-semibold text-white transition hover:bg-[#006F34]"
              >
                Kirjaudu
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-gray-500 transition hover:text-[#00843D]"
              >
                ← Takaisin sakkokassaan
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080B09] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-[#00843D]">
              Sakkokassa
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Ylläpito
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer rounded-xl border border-[#1C2A21] bg-[#101712] px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-[#00843D] hover:text-white"
          >
            Kirjaudu ulos
          </button>
        </header>

        <section className="mb-8 rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <h2 className="mb-5 text-xl font-bold">
            Lisää sakko
          </h2>

          <form
            onSubmit={handleAddFine}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Pelaaja
              </label>

              <select
                value={selectedPlayer}
                onChange={(e) =>
                  setSelectedPlayer(e.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
              >
                <option value="">
                  Valitse pelaaja
                </option>

                {players.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Syy
              </label>

              <input
                type="text"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                className="w-full rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
                placeholder="Esim. Myöhässä"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Summa (€)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                className="w-full rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
                placeholder="5"
              />
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-[#00843D] px-4 py-3 font-semibold text-white transition hover:bg-[#006F34]"
            >
              Lisää sakko
            </button>

            {fineMessage && (
              <p
                className={`text-sm ${
                  fineMessage === "Sakko lisätty!"
                    ? "text-[#16A34A]"
                    : "text-red-400"
                }`}
              >
                {fineMessage}
              </p>
            )}
          </form>
        </section>

        <section className="rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Sakot
            </h2>

            <span className="text-sm text-gray-500">
              {fines.length} kpl
            </span>
          </div>

          {fines.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Ei sakkoja.
            </p>
          ) : (
            <div className="divide-y divide-[#1C2A21]">
              {fines.map((fine) => (
                <div
                  key={fine.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {getPlayerName(
                        fine.playerId
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {fine.reason}
                    </p>

                    {fine.createdAt instanceof Timestamp && (
                      <p className="mt-1 text-xs text-gray-600">
                        {fine.createdAt
                          .toDate()
                          .toLocaleDateString("fi-FI")}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-bold text-[#F5A400]">
                      {fine.amount} €
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteFine(fine.id)
                      }
                      className="mt-1 cursor-pointer text-sm text-red-400 transition hover:text-red-300"
                    >
                      Poista
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 transition hover:text-[#00843D]"
          >
            ← Takaisin sakkokassaan
          </a>
        </div>
      </div>
    </main>
  );
}