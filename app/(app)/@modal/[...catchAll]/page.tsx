// A client-side navigation to any non-modal route must clear the modal slot.
// Parallel routes keep the last matched slot content on screen otherwise, so we
// match everything else to a component that renders nothing.
export default function ModalCatchAll() {
  return null;
}
