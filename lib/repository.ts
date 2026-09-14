import {
  initialDeck,
  deckSchema,
  diffDeck,
  type Deck,
  type Workspace,
  type Log,
} from "./model";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function createRepository(database: D1Database) {
  const db = () => database;
  async function scopeFor(user: string, deckId: string) {
    if (deckId === "legacy")
      return {
        table: "revisions",
        where: "owner = ?",
        columns: "owner",
        args: [user],
        initial: initialDeck,
      };
    const row = await db()
      .prepare("SELECT snapshot FROM decks WHERE owner = ? AND id = ?")
      .bind(user, deckId)
      .first<{ snapshot: string }>();
    if (!row) throw new AppError("デッキが見つかりません。", 404);
    return {
      table: "deck_revisions",
      where: "owner = ? AND deck_id = ?",
      columns: "owner,deck_id",
      args: [user, deckId],
      initial: deckSchema.parse(JSON.parse(row.snapshot)),
    };
  }
  async function list(user: string) {
    const rows = await db()
      .prepare("SELECT id, created_at FROM decks WHERE owner = ?")
      .bind(user)
      .all<{ id: string; created_at: string }>();
    return Promise.all(
      [{ id: "legacy", created_at: "" }, ...rows.results].map(async (row) => {
        const w = await workspace(user, row.id);
        return {
          id: row.id,
          title: w.deck.title,
          slideCount: w.deck.slides.length,
          cover: w.deck.slides[0],
          version: w.version,
          updatedAt: w.logs[0]?.at || row.created_at,
        };
      }),
    );
  }
  async function create(user: string, input: Deck) {
    const deck = deckSchema.parse(input),
      id = crypto.randomUUID();
    await db()
      .prepare(
        "INSERT INTO decks(owner,id,snapshot,created_at) VALUES(?,?,?,?)",
      )
      .bind(user, id, JSON.stringify(deck), new Date().toISOString())
      .run();
    return { id };
  }
  type Row = {
    version: number;
    request_id: string;
    snapshot: string;
    reason: string;
    actor: string;
    at: string;
    changes: string;
  };
  async function workspace(
    user: string,
    deckId = "legacy",
  ): Promise<Workspace> {
    const scope = await scopeFor(user, deckId);
    const latest = await db()
      .prepare(
        `SELECT * FROM ${scope.table} WHERE ${scope.where} ORDER BY version DESC LIMIT 1`,
      )
      .bind(...scope.args)
      .first<Row>();
    if (!latest) return { deck: scope.initial, version: 0, logs: [] };
    const result = await db()
      .prepare(
        `SELECT version, request_id, reason, actor, at, changes FROM ${scope.table} WHERE ${scope.where} ORDER BY version DESC`,
      )
      .bind(...scope.args)
      .all<Row>();
    return {
      deck: deckSchema.parse(JSON.parse(latest.snapshot)),
      version: latest.version,
      logs: result.results.map(
        (r) =>
          ({
            version: r.version,
            id: r.request_id,
            reason: r.reason,
            actor: r.actor,
            at: r.at,
            changes: JSON.parse(r.changes),
          }) as Log,
      ),
    };
  }
  async function restoreSnapshot(
    user: string,
    version: number,
    deckId = "legacy",
  ) {
    const scope = await scopeFor(user, deckId);
    if (version === 0) return scope.initial;
    const row = await db()
      .prepare(
        `SELECT snapshot FROM ${scope.table} WHERE ${scope.where} AND version = ?`,
      )
      .bind(...scope.args, version)
      .first<{ snapshot: string }>();
    if (!row) throw new AppError("復元する版が見つかりません。", 404);
    return deckSchema.parse(JSON.parse(row.snapshot));
  }
  async function save(
    user: string,
    input: {
      deck: Deck;
      version: number;
      requestId: string;
      reason: string;
      actor: string;
    },
    deckId = "legacy",
  ) {
    const scope = await scopeFor(user, deckId);
    const prior = await db()
      .prepare(
        `SELECT version FROM ${scope.table} WHERE ${scope.where} AND request_id = ?`,
      )
      .bind(...scope.args, input.requestId)
      .first();
    if (prior) return workspace(user, deckId);
    const current = await workspace(user, deckId);
    if (current.version !== input.version)
      throw new AppError(
        "別の操作で更新されています。未保存の内容をJSONで退避してから、最新版を読み込んでください。",
        409,
      );
    const deck = deckSchema.parse(input.deck);
    const changes = diffDeck(current.deck, deck);
    if (!changes.length) return current;
    try {
      await db()
        .prepare(
          `INSERT INTO ${scope.table} (${scope.columns},version,request_id,snapshot,reason,actor,at,changes) VALUES (${scope.args.map(() => "?").join(",")},?,?,?,?,?,?,?)`,
        )
        .bind(
          ...scope.args,
          current.version + 1,
          input.requestId,
          JSON.stringify(deck),
          input.reason,
          input.actor,
          new Date().toISOString(),
          JSON.stringify(changes),
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw new AppError(
          "更新が競合しました。内容を退避してから最新版を読み込んでください。",
          409,
        );
      throw e;
    }
    return workspace(user, deckId);
  }

  return { workspace, restoreSnapshot, save, list, create };
}
