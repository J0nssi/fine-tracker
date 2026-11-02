"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type Player = {
  id: string;
  name: string;
};

type Fine = {
  id: string;
  playerId: string;
  reason: string;
  amount: number;
  createdAt?: Timestamp | null;
};

type FineOption = {
  name: string;
  amount: number;
};

const fineOptions: FineOption[] = [
  { name: "Myöhässä treeneistä", amount: 5 },
  { name: "Myöhässä pelistä", amount: 10 },
  { name: "Poissa treeneistä ilmoittamatta", amount: 10 },
  { name: "Poissa pelistä ilmoittamatta", amount: 20 },
  { name: "Varusteet unohtuneet", amount: 5 },
  { name: "Juomapullo unohtunut", amount: 5 },
  { name: "Jopox-ilmoittautuminen puuttuu", amount: 5 },
  { name: "Muu", amount: 0 },
];

const inputClassName =
  "w-full rounded-xl border border-[#1C2A21] bg-[#080B09] px-4 py-3 text-white outline-none transition focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]";
const labelClassName = "mb-2 block text-sm font-medium text-gray-300";

function getJopoxReason() {
  const today = new Date();
  return `Jopox-ilmoittautuminen puuttuu ${today.getDate()}.${today.getMonth() + 1}.`;
}

function getFineDate(fine: Fine) {
  if (!fine.createdAt) return "";
  return fine.createdAt.toDate().toLocaleDateString("fi-FI");
}

function sortNewestFirst(a: Fine, b: Fine) {
  return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerMessage, setPlayerMessage] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedFineType, setSelectedFineType] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [fineMessage, setFineMessage] = useState("");

  // Editing is shown inline under the selected fine's compact row.
  const [editingFineId, setEditingFineId] = useState<string | null>(null);
  const [editPlayerId, setEditPlayerId] = useState("");
  const [editFineType, setEditFineType] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Keep the player list live so a newly added player appears immediately.
    const unsubscribePlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const playerData = snapshot.docs
        .map((playerDoc) => ({
          id: playerDoc.id,
          name: String(playerDoc.data().name ?? ""),
        }))
        .filter((player) => player.name.trim().length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, "fi"));

      setPlayers(playerData);
    });

    const unsubscribeFines = onSnapshot(collection(db, "fines"), (snapshot) => {
      const fineData = snapshot.docs.map((fineDoc) => {
        const data = fineDoc.data();
        return {
          id: fineDoc.id,
          playerId: String(data.playerId ?? ""),
          reason: String(data.reason ?? ""),
          amount: Number(data.amount ?? 0),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
        };
      });

      setFines(fineData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePlayers();
      unsubscribeFines();
    };
  }, []);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail("");
      setPassword("");
    } catch {
      setError("Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? "Tuntematon pelaaja";

  const handleAddPlayer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPlayerMessage("");

    const trimmedName = newPlayerName.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      setPlayerMessage("Anna pelaajan nimi.");
      return;
    }

    const alreadyExists = players.some(
      (player) => player.name.toLocaleLowerCase("fi") === trimmedName.toLocaleLowerCase("fi")
    );
    if (alreadyExists) {
      setPlayerMessage("Tämänniminen pelaaja löytyy jo listalta.");
      return;
    }

    setIsAddingPlayer(true);
    try {
      await addDoc(collection(db, "players"), { name: trimmedName });
      setNewPlayerName("");
      setPlayerMessage(`Pelaaja ${trimmedName} lisätty!`);
    } catch {
      setPlayerMessage("Pelaajan lisääminen epäonnistui.");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const applyFineType = (
    value: string,
    setType: (value: string) => void,
    setFineReason: (value: string) => void,
    setFineAmount: (value: string) => void
  ) => {
    setType(value);

    if (value === "custom") {
      setFineReason("");
      setFineAmount("");
      return;
    }

    const option = fineOptions.find((fineOption) => fineOption.name === value);
    if (!option) return;

    setFineReason(
      option.name === "Jopox-ilmoittautuminen puuttuu"
        ? getJopoxReason()
        : option.name
    );
    setFineAmount(option.amount > 0 ? String(option.amount) : "");
  };

  const handleAddFine = async (e: FormEvent<HTMLFormElement>) => {
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
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
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

      setSelectedPlayer("");
      setSelectedFineType("");
      setReason("");
      setAmount("");
      setFineMessage("Sakko lisätty!");
    } catch {
      setFineMessage("Sakon lisääminen epäonnistui.");
    }
  };

  const handleEditFine = (fine: Fine) => {
    setEditingFineId(fine.id);
    setEditPlayerId(fine.playerId);
    setEditReason(fine.reason);
    setEditAmount(String(fine.amount));
    const matchingOption = fineOptions.find(
      (option) => option.name === fine.reason ||
        (option.name === "Jopox-ilmoittautuminen puuttuu" && fine.reason.startsWith(option.name))
    );
    setEditFineType(matchingOption?.name ?? "custom");
    setEditMessage("");
  };

  const handleSaveFineEdit = async (e: FormEvent<HTMLFormElement>, fineId: string) => {
    e.preventDefault();
    setEditMessage("");

    const numericAmount = Number(editAmount);
    if (!editPlayerId) {
      setEditMessage("Valitse pelaaja.");
      return;
    }
    if (!editReason.trim()) {
      setEditMessage("Anna sakolle syy.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setEditMessage("Anna kelvollinen summa.");
      return;
    }

    try {
      await updateDoc(doc(db, "fines", fineId), {
        playerId: editPlayerId,
        reason: editReason.trim(),
        amount: numericAmount,
      });
      setEditingFineId(null);
      setEditMessage("");
    } catch {
      setEditMessage("Sakon muokkaaminen epäonnistui.");
    }
  };

  const handleCancelEdit = () => {
    setEditingFineId(null);
    setEditPlayerId("");
    setEditFineType("");
    setEditReason("");
    setEditAmount("");
    setEditMessage("");
  };

  const handleDeleteFine = async (fineId: string) => {
    if (!window.confirm("Haluatko varmasti poistaa tämän sakon?")) return;

    try {
      await deleteDoc(doc(db, "fines", fineId));
      if (editingFineId === fineId) handleCancelEdit();
    } catch {
      setFineMessage("Sakon poistaminen epäonnistui.");
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#080B09] px-4 py-8 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">Sakkokassa</h1>
              <p className="mt-2 text-sm font-medium uppercase tracking-widest text-gray-500">Ylläpito</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelClassName}>Sähköposti</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="sähköposti"
                />
              </div>
              <div>
                <label className={labelClassName}>Salasana</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClassName}
                  placeholder="salasana"
                />
              </div>
              {error && <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</p>}
              <button type="submit" className="w-full cursor-pointer rounded-xl bg-[#00843D] px-4 py-3 font-semibold text-white transition hover:bg-[#006F34]">
                Kirjaudu
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-gray-500 transition hover:text-[#00843D]">← Takaisin sakkokassaan</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const finesByPlayer = players
    .map((player) => ({
      player,
      playerFines: fines.filter((fine) => fine.playerId === player.id).sort(sortNewestFirst),
    }))
    .filter((group) => group.playerFines.length > 0);

  const unknownPlayerFines = fines
    .filter((fine) => !players.some((player) => player.id === fine.playerId))
    .sort(sortNewestFirst);

  return (
    <main className="min-h-screen bg-[#080B09] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-[#00843D]">Sakkokassa</p>
            <h1 className="mt-1 text-3xl font-bold">Ylläpito</h1>
          </div>
          <button type="button" onClick={handleLogout} className="cursor-pointer rounded-xl border border-[#1C2A21] bg-[#101712] px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-[#00843D] hover:text-white">
            Kirjaudu ulos
          </button>
        </header>

        <section className="mb-6 rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Joukkueen pelaajat</h2>
              <p className="mt-1 text-sm text-gray-500">Pelaajia yhteensä {players.length}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddPlayer((current) => !current);
                setPlayerMessage("");
              }}
              className="cursor-pointer rounded-xl border border-[#00843D] px-4 py-2 text-sm font-semibold text-[#35B66B] transition hover:bg-[#00843D]/10"
            >
              {showAddPlayer ? "Sulje" : "+ Lisää pelaaja"}
            </button>
          </div>

          {showAddPlayer && (
            <form onSubmit={handleAddPlayer} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className={inputClassName}
                placeholder="Uuden pelaajan nimi"
                maxLength={60}
                autoFocus
              />
              <button
                type="submit"
                disabled={isAddingPlayer}
                className="shrink-0 cursor-pointer rounded-xl bg-[#00843D] px-5 py-3 font-semibold text-white transition hover:bg-[#006F34] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingPlayer ? "Lisätään..." : "Tallenna pelaaja"}
              </button>
            </form>
          )}
          {playerMessage && (
            <p className={`mt-3 text-sm ${playerMessage.endsWith("lisätty!") ? "text-[#16A34A]" : "text-red-400"}`}>
              {playerMessage}
            </p>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <h2 className="mb-5 text-xl font-bold">Lisää sakko</h2>
          <form onSubmit={handleAddFine} className="space-y-4">
            <div>
              <label className={labelClassName}>Pelaaja</label>
              <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} required className={`${inputClassName} cursor-pointer`}>
                <option value="">Valitse pelaaja</option>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClassName}>Sakkotyyppi</label>
              <select
                value={selectedFineType}
                onChange={(e) => applyFineType(e.target.value, setSelectedFineType, setReason, setAmount)}
                className={`${inputClassName} cursor-pointer`}
              >
                <option value="">Valitse sakkotyyppi</option>
                {fineOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}{option.amount > 0 ? ` – ${option.amount} €` : ""}
                  </option>
                ))}
                <option value="custom">Muu / oma sakko</option>
              </select>
            </div>

            <div>
              <label className={labelClassName}>Syy</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={inputClassName} placeholder="Sakon syy" required />
            </div>
            <div>
              <label className={labelClassName}>Summa (€)</label>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClassName} placeholder="5" required />
            </div>
            <button type="submit" className="w-full cursor-pointer rounded-xl bg-[#00843D] px-4 py-3 font-semibold text-white transition hover:bg-[#006F34]">
              Lisää sakko
            </button>
            {fineMessage && <p className={`text-sm ${fineMessage === "Sakko lisätty!" ? "text-[#16A34A]" : "text-red-400"}`}>{fineMessage}</p>}
          </form>
        </section>

        <section className="rounded-2xl border border-[#1C2A21] bg-[#101712] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Sakot pelaajittain</h2>
            <span className="text-sm text-gray-500">{fines.length} kpl</span>
          </div>

          {fines.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Ei sakkoja.</p>
          ) : (
            <div className="space-y-5">
              {finesByPlayer.map(({ player, playerFines }) => (
                <div key={player.id} className="overflow-hidden rounded-xl border border-[#26372C]">
                  <div className="flex items-center justify-between gap-3 bg-[#17221A] px-4 py-3">
                    <h3 className="font-semibold">{player.name}</h3>
                    <span className="text-xs text-gray-500">{playerFines.length} {playerFines.length === 1 ? "sakko" : "sakkoa"}</span>
                  </div>

                  <div className="divide-y divide-[#1C2A21] px-4">
                    {playerFines.map((fine) => (
                      <div key={fine.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-200">{fine.reason}</p>
                            <p className="mt-1 text-xs text-gray-600">{getFineDate(fine)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-semibold text-[#F5A400]">{fine.amount} €</span>
                            <button type="button" onClick={() => editingFineId === fine.id ? handleCancelEdit() : handleEditFine(fine)} className="cursor-pointer text-sm text-[#35B66B] transition hover:text-[#62D98F]">
                              {editingFineId === fine.id ? "Sulje" : "Muokkaa"}
                            </button>
                            <button type="button" onClick={() => handleDeleteFine(fine.id)} className="cursor-pointer text-sm text-red-400 transition hover:text-red-300">
                              Poista
                            </button>
                          </div>
                        </div>

                        {editingFineId === fine.id && (
                          <form onSubmit={(e) => handleSaveFineEdit(e, fine.id)} className="mt-4 space-y-3 rounded-xl border border-[#26372C] bg-[#080B09] p-4">
                            <p className="text-sm font-semibold text-gray-300">Muokkaa sakkoa</p>
                            <div>
                              <label className={labelClassName}>Pelaaja</label>
                              <select value={editPlayerId} onChange={(e) => setEditPlayerId(e.target.value)} className={`${inputClassName} cursor-pointer`}>
                                {players.map((playerOption) => <option key={playerOption.id} value={playerOption.id}>{playerOption.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={labelClassName}>Sakkotyyppi</label>
                              <select value={editFineType} onChange={(e) => applyFineType(e.target.value, setEditFineType, setEditReason, setEditAmount)} className={`${inputClassName} cursor-pointer`}>
                                {fineOptions.map((option) => <option key={option.name} value={option.name}>{option.name}{option.amount > 0 ? ` – ${option.amount} €` : ""}</option>)}
                                <option value="custom">Muu / oma sakko</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClassName}>Syy</label>
                              <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} className={inputClassName} required />
                            </div>
                            <div>
                              <label className={labelClassName}>Summa (€)</label>
                              <input type="number" min="0.01" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inputClassName} required />
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button type="submit" className="cursor-pointer rounded-xl bg-[#00843D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006F34]">Tallenna muutokset</button>
                              <button type="button" onClick={handleCancelEdit} className="cursor-pointer rounded-xl border border-[#26372C] px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500">Peruuta</button>
                            </div>
                            {editMessage && <p className="text-sm text-red-400">{editMessage}</p>}
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {unknownPlayerFines.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-[#26372C]">
                  <div className="bg-[#17221A] px-4 py-3"><h3 className="font-semibold">Tuntematon pelaaja</h3></div>
                  <div className="divide-y divide-[#1C2A21] px-4">
                    {unknownPlayerFines.map((fine) => (
                      <div key={fine.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div><p className="text-sm text-gray-200">{fine.reason}</p><p className="mt-1 text-xs text-gray-600">{getFineDate(fine)}</p></div>
                        <div className="flex items-center gap-3"><span className="font-semibold text-[#F5A400]">{fine.amount} €</span><button type="button" onClick={() => handleDeleteFine(fine.id)} className="cursor-pointer text-sm text-red-400 hover:text-red-300">Poista</button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-gray-600 transition hover:text-[#00843D]">← Takaisin sakkokassaan</a>
        </div>
      </div>
    </main>
  );
}
