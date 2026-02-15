import { Atom } from "@effect-atom/atom-react"
import { ManagedRuntime } from "effect"
import { MapleApiAtomClient } from "./atom-client"

export const runtimeLayer = MapleApiAtomClient.layer

export const runtime = ManagedRuntime.make(runtimeLayer, Atom.defaultMemoMap)
