import * as Y from "yjs";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

interface ProviderOptions {
  supabase: SupabaseClient;
  documentId: string;
  doc: Y.Doc;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface PresenceState {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  cursorColor: string;
  onlineAt: string;
}

type PresenceCallback = (presences: PresenceState[]) => void;

const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];

function userIdToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export class SupabaseYjsProvider {
  private channel: RealtimeChannel;
  private doc: Y.Doc;
  private user: ProviderOptions["user"];
  private documentId: string;
  private supabase: SupabaseClient;
  private synced = false;
  private destroyed = false;
  private presenceCallbacks: PresenceCallback[] = [];
  private _isPersistenceLeader = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly cursorColor: string;

  get isPersistenceLeader(): boolean {
    return this._isPersistenceLeader;
  }

  constructor(options: ProviderOptions) {
    this.supabase = options.supabase;
    this.documentId = options.documentId;
    this.doc = options.doc;
    this.user = options.user;
    this.cursorColor = userIdToColor(options.user.id);

    this.channel = this.supabase.channel(`doc:${this.documentId}`, {
      config: { broadcast: { self: false } },
    });

    this.setupChannel();
  }

  private setupChannel(): void {
    this.channel
      .on("broadcast", { event: "yjs-update" }, (payload) => {
        if (this.destroyed) return;
        const update = this.base64ToUint8Array(payload.payload.update);
        Y.applyUpdate(this.doc, update, "remote");
      })
      .on("broadcast", { event: "yjs-sync-step-1" }, (payload) => {
        if (this.destroyed) return;
        const sv = this.base64ToUint8Array(payload.payload.stateVector);
        const update = Y.encodeStateAsUpdate(this.doc, sv);
        this.channel.send({
          type: "broadcast",
          event: "yjs-sync-step-2",
          payload: { update: this.uint8ArrayToBase64(update) },
        });
      })
      .on("broadcast", { event: "yjs-sync-step-2" }, (payload) => {
        if (this.destroyed) return;
        const update = this.base64ToUint8Array(payload.payload.update);
        Y.applyUpdate(this.doc, update, "remote");
        if (!this.synced) {
          this.synced = true;
        }
      })
      .on("broadcast", { event: "force-reload" }, () => {
        if (this.destroyed) return;
        this.onForceReload?.();
      })
      .on("presence", { event: "sync" }, () => {
        this.updatePresenceState();
        this.electLeader();
      })
      .on("presence", { event: "join" }, () => {
        this.updatePresenceState();
        this.electLeader();
      })
      .on("presence", { event: "leave" }, () => {
        this.updatePresenceState();
        this.electLeader();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.reconnectAttempts = 0;

          await this.channel.track({
            userId: this.user.id,
            displayName: this.user.displayName,
            avatarUrl: this.user.avatarUrl,
            cursorColor: this.cursorColor,
            onlineAt: new Date().toISOString(),
          });

          const sv = Y.encodeStateVector(this.doc);
          this.channel.send({
            type: "broadcast",
            event: "yjs-sync-step-1",
            payload: { stateVector: this.uint8ArrayToBase64(sv) },
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.handleReconnect();
        }
      });

    this.doc.on("update", this.handleDocUpdate);
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === "remote" || this.destroyed) return;
    this.channel.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: this.uint8ArrayToBase64(update) },
    });
  };

  private handleReconnect(): void {
    if (this.destroyed || this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.supabase.removeChannel(this.channel);
      this.channel = this.supabase.channel(`doc:${this.documentId}`, {
        config: { broadcast: { self: false } },
      });
      this.setupChannel();
    }, delay);
  }

  private electLeader(): void {
    const presenceState = this.channel.presenceState<PresenceState>();
    const allPresences: PresenceState[] = [];
    for (const key in presenceState) {
      const entries = presenceState[key] as PresenceState[];
      allPresences.push(...entries);
    }

    if (allPresences.length === 0) {
      this._isPersistenceLeader = false;
      return;
    }

    allPresences.sort((a, b) => a.onlineAt.localeCompare(b.onlineAt));
    this._isPersistenceLeader = allPresences[0].userId === this.user.id;
  }

  private updatePresenceState(): void {
    const presenceState = this.channel.presenceState<PresenceState>();
    const presences: PresenceState[] = [];
    for (const key in presenceState) {
      const entries = presenceState[key] as PresenceState[];
      presences.push(...entries);
    }
    for (const cb of this.presenceCallbacks) {
      cb(presences);
    }
  }

  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter((cb) => cb !== callback);
    };
  }

  onForceReload: (() => void) | null = null;

  private uint8ArrayToBase64(data: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.doc.off("update", this.handleDocUpdate);
    this.channel.untrack();
    this.supabase.removeChannel(this.channel);
    this.presenceCallbacks = [];
  }
}
