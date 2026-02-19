import { Atom } from "@effect-atom/atom-react"
import * as KeyValueStore from "@effect/platform/KeyValueStore"

export const localStorageRuntime = Atom.runtime(
  KeyValueStore.layerStorage(() => localStorage),
)
