//import { TileMarker } from "../content";
import { ClickController } from "./ClickController";
import { Player } from "./Player";
import { Viewport } from "./Viewport";
import { SoundCache } from "./utils/SoundCache";

// container for globals to prevent circular dependencies. Do NOT import Viewport into this class.
export class Trainer {
    static _player: Player;
    static _clickController: ClickController;

    static setClickController(clickController: ClickController) {
        this._clickController = clickController;
    }

    static setPlayer(player: Player) {
        this._player = player;
        SoundCache.setAudioListener(player);
    }

    static get player() {
        return this._player;
    }

    static get clickController() {
        return this._clickController;
    }

    static reset() {
        Trainer._player.region.reset();
        Trainer.resetListeners.forEach((listener) => listener());
    }

    // Lightweight events so UI shells can react to the fight ending without polling.
    private static deathListeners = new Set<() => void>();
    private static resetListeners = new Set<() => void>();

    static onPlayerDeath(listener: () => void) {
        Trainer.deathListeners.add(listener);
        return () => Trainer.deathListeners.delete(listener);
    }

    static onReset(listener: () => void) {
        Trainer.resetListeners.add(listener);
        return () => Trainer.resetListeners.delete(listener);
    }

    static notifyPlayerDeath() {
        Trainer.deathListeners.forEach((listener) => listener());
    }
}
