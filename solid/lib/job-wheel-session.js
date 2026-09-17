import { createSignal } from "solid-js";
import { createLocalDate } from "./current-date.js";

/*
 * Home owns one wheel session and passes it both to the Home Jobs section and
 * to the Jobs section inside Meeting Mode. The two views therefore mirror the
 * same chosen job, winner, shuffled order and temporarily removed students
 * instead of acting like two unrelated wheels.
 */
export function createJobWheelSession(defaultJobId = "water1") {
  return {
    today: createLocalDate(),
    selectedJobId: createSignal(defaultJobId),
    winner: createSignal(null),
    removedIds: createSignal([]),
    shuffleSeed: createSignal(0),
  };
}
